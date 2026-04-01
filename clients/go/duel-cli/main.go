package main

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	phalanx "github.com/phalanxduel/game/sdk/go"
)

const defaultBaseURL = "http://127.0.0.1:3001"

var uuidPattern = regexp.MustCompile(`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}`)

type wsEnvelope struct {
	Type  string `json:"type"`
	Code  string `json:"code,omitempty"`
	Error string `json:"error,omitempty"`
}

type createMatchRequest struct {
	Type       string `json:"type"`
	PlayerName string `json:"playerName"`
	Opponent   string `json:"opponent,omitempty"`
}

type joinMatchRequest struct {
	Type       string `json:"type"`
	MatchID    string `json:"matchId"`
	PlayerName string `json:"playerName"`
}

type actionRequest struct {
	Type    string          `json:"type"`
	MatchID string          `json:"matchId"`
	Action  json.RawMessage `json:"action"`
}

type matchCreatedMessage struct {
	Type      string `json:"type"`
	MatchID   string `json:"matchId"`
	PlayerID  string `json:"playerId"`
	PlayerIdx int    `json:"playerIndex"`
}

type matchJoinedMessage struct {
	Type      string `json:"type"`
	MatchID   string `json:"matchId"`
	PlayerID  string `json:"playerId"`
	PlayerIdx int    `json:"playerIndex"`
}

type opponentSessionMessage struct {
	Type    string `json:"type"`
	MatchID string `json:"matchId"`
}

type gameStateMessage struct {
	Type      string             `json:"type"`
	MatchID   string             `json:"matchId"`
	ViewModel websocketViewModel `json:"viewModel"`
}

type websocketViewModel struct {
	PostState    gameStateSnapshot `json:"postState"`
	ValidActions []json.RawMessage `json:"validActions"`
	ViewerIndex  *int              `json:"viewerIndex"`
}

type gameStateSnapshot struct {
	Phase      string           `json:"phase"`
	TurnNumber int              `json:"turnNumber"`
	Players    []playerSnapshot `json:"players"`
	Outcome    *gameOutcome     `json:"outcome"`
}

type gameOutcome struct {
	WinnerIndex int    `json:"winnerIndex"`
	VictoryType string `json:"victoryType"`
	TurnNumber  int    `json:"turnNumber"`
}

type playerSnapshot struct {
	Player      playerIdentity    `json:"player"`
	Lifepoints  int               `json:"lifepoints"`
	Hand        []visibleCard     `json:"hand,omitempty"`
	HandCount   *int              `json:"handCount,omitempty"`
	Battlefield []json.RawMessage `json:"battlefield"`
}

type playerIdentity struct {
	Name string `json:"name"`
}

type visibleCard struct {
	ID    string `json:"id"`
	Face  string `json:"face"`
	Suit  string `json:"suit"`
	Type  string `json:"type"`
	Value int    `json:"value"`
}

type modeChoice struct {
	Label    string
	Opponent string
	Join     bool
}

func deriveWebSocketURL(baseURL string) string {
	switch {
	case strings.HasPrefix(baseURL, "https://"):
		return "wss://" + strings.TrimPrefix(baseURL, "https://") + "/ws"
	case strings.HasPrefix(baseURL, "http://"):
		return "ws://" + strings.TrimPrefix(baseURL, "http://") + "/ws"
	default:
		return "ws://" + strings.TrimPrefix(baseURL, "ws://") + "/ws"
	}
}

func websocketOrigin(baseURL string) string {
	switch {
	case strings.HasPrefix(baseURL, "ws://"):
		return "http://" + strings.TrimPrefix(baseURL, "ws://")
	case strings.HasPrefix(baseURL, "wss://"):
		return "https://" + strings.TrimPrefix(baseURL, "wss://")
	default:
		return baseURL
	}
}

func buildPlayLink(baseURL string, matchID string) string {
	parsed, err := url.Parse(baseURL)
	if err != nil {
		return fmt.Sprintf("%s/?match=%s", strings.TrimRight(baseURL, "/"), matchID)
	}

	parsed.Path = "/"
	query := parsed.Query()
	query.Set("match", matchID)
	parsed.RawQuery = query.Encode()
	return parsed.String()
}

func dialWebSocket(wsURL string, origin string) *websocket.Conn {
	conn, _, err := websocket.DefaultDialer.Dial(wsURL, http.Header{
		"Origin": []string{origin},
	})
	if err != nil {
		log.Fatalf("❌ Failed to open websocket: %v", err)
	}
	return conn
}

func mustWriteJSON(conn *websocket.Conn, payload any) {
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	if err := conn.WriteJSON(payload); err != nil {
		log.Fatalf("❌ Failed to write WebSocket message: %v", err)
	}
}

func readMessage(conn *websocket.Conn) (wsEnvelope, []byte) {
	conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	_, payload, err := conn.ReadMessage()
	if err != nil {
		log.Fatalf("❌ Failed to read WebSocket message: %v", err)
	}

	var envelope wsEnvelope
	if err := json.Unmarshal(payload, &envelope); err != nil {
		log.Fatalf("❌ Failed to decode message envelope: %v", err)
	}

	if envelope.Type == "matchError" || envelope.Type == "actionError" || envelope.Type == "authError" {
		log.Fatalf("❌ Server returned %s: %s (%s)", envelope.Type, envelope.Error, envelope.Code)
	}

	return envelope, payload
}

func decodePayload[T any](payload []byte, typeLabel string) T {
	var message T
	if err := json.Unmarshal(payload, &message); err != nil {
		log.Fatalf("❌ Failed to decode %s payload: %v", typeLabel, err)
	}
	return message
}

func readLine(reader *bufio.Reader, prompt string) string {
	for {
		fmt.Print(prompt)
		line, err := reader.ReadString('\n')
		if err != nil {
			log.Fatalf("❌ Failed to read input: %v", err)
		}
		trimmed := strings.TrimSpace(line)
		if trimmed != "" {
			return trimmed
		}
	}
}

func chooseMode(reader *bufio.Reader) modeChoice {
	choices := []modeChoice{
		{Label: "Create a duel against another player"},
		{Label: "Join a duel from a code or link", Join: true},
		{Label: "Start a game against Bot (Random)", Opponent: "bot-random"},
		{Label: "Start a game against Bot (Heuristic)", Opponent: "bot-heuristic"},
	}

	fmt.Println("\nSelect a play mode:")
	for index, choice := range choices {
		fmt.Printf("  %d. %s\n", index+1, choice.Label)
	}

	for {
		raw := readLine(reader, "Choice: ")
		choiceIndex, err := strconv.Atoi(raw)
		if err == nil && choiceIndex >= 1 && choiceIndex <= len(choices) {
			return choices[choiceIndex-1]
		}
		fmt.Println("Enter a valid menu number.")
	}
}

func parseMatchReference(raw string) string {
	if matchID := uuidPattern.FindString(raw); matchID != "" {
		return matchID
	}
	log.Fatalf("❌ Could not find a match ID in %q", raw)
	return ""
}

func occupiedBattlefieldCount(slots []json.RawMessage) int {
	count := 0
	for _, slot := range slots {
		trimmed := strings.TrimSpace(string(slot))
		if trimmed != "" && trimmed != "null" {
			count++
		}
	}
	return count
}

func visibleHandSummary(cards []visibleCard) string {
	if len(cards) == 0 {
		return "hidden"
	}
	parts := make([]string, 0, len(cards))
	for _, card := range cards {
		parts = append(parts, fmt.Sprintf("%s%s", card.Face, suitGlyph(card.Suit)))
	}
	return strings.Join(parts, ", ")
}

func suitGlyph(suit string) string {
	switch strings.ToLower(suit) {
	case "hearts":
		return "♥"
	case "diamonds":
		return "♦"
	case "clubs":
		return "♣"
	case "spades":
		return "♠"
	default:
		return suit
	}
}

func renderGameState(message gameStateMessage) {
	postState := message.ViewModel.PostState
	fmt.Printf("\n== Turn %d | Phase: %s ==\n", postState.TurnNumber, postState.Phase)

	for index, player := range postState.Players {
		handCount := len(player.Hand)
		if player.HandCount != nil {
			handCount = *player.HandCount
		}

		name := player.Player.Name
		if name == "" {
			name = fmt.Sprintf("Player %d", index+1)
		}

		fmt.Printf(
			"P%d %-18s HP=%d Hand=%d Battlefield=%d\n",
			index+1,
			name,
			player.Lifepoints,
			handCount,
			occupiedBattlefieldCount(player.Battlefield),
		)

		if len(player.Hand) > 0 {
			fmt.Printf("   Visible hand: %s\n", visibleHandSummary(player.Hand))
		}
	}
}

func actionType(action json.RawMessage) string {
	var payload struct {
		Type string `json:"type"`
	}
	if err := json.Unmarshal(action, &payload); err != nil {
		return "unknown"
	}
	return payload.Type
}

func actionSummary(action json.RawMessage) string {
	var compact bytes.Buffer
	if err := json.Compact(&compact, action); err == nil {
		return compact.String()
	}
	return string(action)
}

func chooseAction(reader *bufio.Reader, actions []json.RawMessage) json.RawMessage {
	nonForfeit := make([]json.RawMessage, 0, len(actions))
	var forfeitAction json.RawMessage

	for _, action := range actions {
		if actionType(action) == "forfeit" {
			forfeitAction = action
			continue
		}
		nonForfeit = append(nonForfeit, action)
	}

	if len(nonForfeit) == 0 {
		fmt.Println("⏳ No active move choices yet. Waiting for the other side...")
		return nil
	}

	choices := append([]json.RawMessage{}, nonForfeit...)
	if len(forfeitAction) > 0 {
		choices = append(choices, forfeitAction)
	}

	fmt.Println("Available actions:")
	for index, action := range choices {
		fmt.Printf("  %d. %s\n", index+1, actionSummary(action))
	}

	for {
		raw := readLine(reader, "Action: ")
		choiceIndex, err := strconv.Atoi(raw)
		if err == nil && choiceIndex >= 1 && choiceIndex <= len(choices) {
			return choices[choiceIndex-1]
		}
		fmt.Println("Enter a valid action number.")
	}
}

func runGameplayLoop(conn *websocket.Conn, reader *bufio.Reader, matchID string) {
	waitingPrinted := false

	for {
		envelope, payload := readMessage(conn)

		switch envelope.Type {
		case "matchJoined":
			joined := decodePayload[matchJoinedMessage](payload, envelope.Type)
			fmt.Printf("✅ Joined match %s as player %d.\n", joined.MatchID, joined.PlayerIdx)
		case "opponentDisconnected":
			event := decodePayload[opponentSessionMessage](payload, envelope.Type)
			fmt.Printf("⚠️ Opponent disconnected from %s.\n", event.MatchID)
		case "opponentReconnected":
			event := decodePayload[opponentSessionMessage](payload, envelope.Type)
			fmt.Printf("✅ Opponent reconnected to %s.\n", event.MatchID)
		case "gameState":
			state := decodePayload[gameStateMessage](payload, envelope.Type)
			matchID = state.MatchID
			waitingPrinted = false
			renderGameState(state)

			if outcome := state.ViewModel.PostState.Outcome; outcome != nil {
				fmt.Printf(
					"\n🏁 Game over. Winner: Player %d via %s on turn %d.\n",
					outcome.WinnerIndex+1,
					outcome.VictoryType,
					outcome.TurnNumber,
				)
				return
			}

			selectedAction := chooseAction(reader, state.ViewModel.ValidActions)
			if len(selectedAction) == 0 {
				if !waitingPrinted {
					fmt.Println("Waiting for the next game state update...")
					waitingPrinted = true
				}
				continue
			}

			mustWriteJSON(conn, actionRequest{
				Type:    "action",
				MatchID: matchID,
				Action:  selectedAction,
			})
		default:
			fmt.Printf("ℹ️ Received %s\n", envelope.Type)
		}
	}
}

func main() {
	fmt.Println("🛡️ Phalanx Duel — Go Duel CLI")
	fmt.Println("-----------------------------")

	baseURL := strings.TrimSpace(os.Getenv("PHALANX_SERVER_URL"))
	if baseURL == "" {
		baseURL = defaultBaseURL
	}

	cfg := phalanx.NewConfiguration()
	cfg.Servers = phalanx.ServerConfigurations{
		{
			URL:         baseURL,
			Description: "CLI target server",
		},
	}

	client := phalanx.NewAPIClient(cfg)
	wsURL := deriveWebSocketURL(baseURL)
	origin := websocketOrigin(baseURL)
	reader := bufio.NewReader(os.Stdin)

	fmt.Println("🔍 Fetching system defaults...")
	resp, httpResp, err := client.ConfigAPI.ApiDefaultsGet(context.Background()).Execute()
	if err != nil {
		if httpResp != nil {
			log.Fatalf("❌ Failed to fetch defaults: %v (HTTP %d)", err, httpResp.StatusCode)
		}
		log.Fatalf("❌ Failed to connect to server: %v", err)
	}

	fmt.Println("✅ Connected to Phalanx Duel API")
	if resp.HasMeta() && resp.Meta.HasConstraints() {
		c := resp.Meta.Constraints
		rows := c.GetRows()
		cols := c.GetColumns()
		fmt.Printf(
			"📊 Constraints: Rows (%d-%d), Columns (%d-%d)\n",
			rows.GetMin(),
			rows.GetMax(),
			cols.GetMin(),
			cols.GetMax(),
		)
	}

	playerName := readLine(reader, "\nPlayer name: ")
	mode := chooseMode(reader)

	fmt.Printf("\n🔌 Connecting to %s...\n", wsURL)
	conn := dialWebSocket(wsURL, origin)
	defer conn.Close()

	switch {
	case mode.Join:
		matchReference := readLine(reader, "Enter a match code or invite link: ")
		matchID := parseMatchReference(matchReference)
		mustWriteJSON(conn, joinMatchRequest{
			Type:       "joinMatch",
			MatchID:    matchID,
			PlayerName: playerName,
		})
		runGameplayLoop(conn, reader, matchID)
	default:
		mustWriteJSON(conn, createMatchRequest{
			Type:       "createMatch",
			PlayerName: playerName,
			Opponent:   mode.Opponent,
		})

		for {
			envelope, payload := readMessage(conn)
			switch envelope.Type {
			case "matchCreated":
				created := decodePayload[matchCreatedMessage](payload, envelope.Type)
				fmt.Printf("✅ Created match %s as player %d.\n", created.MatchID, created.PlayerIdx)
				fmt.Printf("Code: %s\n", created.MatchID)
				fmt.Printf("Play link: %s\n", buildPlayLink(baseURL, created.MatchID))
				if mode.Opponent == "" {
					fmt.Println("Waiting for another player to join...")
				} else {
					fmt.Printf("Opponent: %s\n", mode.Opponent)
				}
				runGameplayLoop(conn, reader, created.MatchID)
				return
			default:
				fmt.Printf("ℹ️ Received %s while waiting for match creation\n", envelope.Type)
			}
		}
	}
}
