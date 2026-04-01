package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
	phalanx "github.com/phalanxduel/game/sdk/go"
)

type wsEnvelope struct {
	Type  string `json:"type"`
	Code  string `json:"code,omitempty"`
	Error string `json:"error,omitempty"`
}

type createMatchRequest struct {
	Type       string `json:"type"`
	PlayerName string `json:"playerName"`
}

type joinMatchRequest struct {
	Type       string `json:"type"`
	MatchID    string `json:"matchId"`
	PlayerName string `json:"playerName"`
}

type matchCreatedMessage struct {
	Type      string `json:"type"`
	MatchID   string `json:"matchId"`
	PlayerID  string `json:"playerId"`
	PlayerIdx int    `json:"playerIndex"`
}

type gameStateMessage struct {
	Type      string                `json:"type"`
	MatchID   string                `json:"matchId"`
	ViewModel phalanx.GameViewModel `json:"viewModel"`
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

func mustWriteJSON(conn *websocket.Conn, payload any) {
	conn.SetWriteDeadline(time.Now().Add(5 * time.Second))
	if err := conn.WriteJSON(payload); err != nil {
		log.Fatalf("❌ Failed to write WebSocket message: %v", err)
	}
}

func waitForMessage[T any](conn *websocket.Conn, expectedType string) T {
	for {
		conn.SetReadDeadline(time.Now().Add(10 * time.Second))
		_, payload, err := conn.ReadMessage()
		if err != nil {
			log.Fatalf("❌ Failed while waiting for %s: %v", expectedType, err)
		}

		var envelope wsEnvelope
		if err := json.Unmarshal(payload, &envelope); err != nil {
			log.Fatalf("❌ Failed to decode message envelope: %v", err)
		}

		if envelope.Type == "matchError" || envelope.Type == "actionError" || envelope.Type == "authError" {
			log.Fatalf("❌ Server returned %s: %s (%s)", envelope.Type, envelope.Error, envelope.Code)
		}

		if envelope.Type != expectedType {
			continue
		}

		var message T
		if err := json.Unmarshal(payload, &message); err != nil {
			log.Fatalf("❌ Failed to decode %s payload: %v", expectedType, err)
		}
		return message
	}
}

func actionSummary(action phalanx.MatchesIdSimulatePost200ResponsePreStateTransactionLogInnerAction) string {
	payload, err := action.MarshalJSON()
	if err != nil {
		return fmt.Sprintf("unmarshalable action (%v)", err)
	}
	return string(payload)
}

func main() {
	fmt.Println("🛡️ Phalanx Duel — Go SDK Example")
	fmt.Println("---------------------------------")

	// 1. Initialize Configuration
	cfg := phalanx.NewConfiguration()
	cfg.Servers = phalanx.ServerConfigurations{
		{
			URL:         "http://127.0.0.1:3001",
			Description: "Local Development Server",
		},
	}

	// 2. Create API Client
	client := phalanx.NewAPIClient(cfg)
	baseURL := cfg.Servers[0].URL
	wsURL := deriveWebSocketURL(baseURL)

	// 3. Fetch Game Defaults (ConfigAPI)
	fmt.Println("🔍 Fetching system defaults...")
	resp, httpResp, err := client.ConfigAPI.ApiDefaultsGet(context.Background()).Execute()
	if err != nil {
		if httpResp != nil {
			log.Fatalf("❌ Failed to fetch defaults: %v (HTTP %d)", err, httpResp.StatusCode)
		} else {
			log.Fatalf("❌ Failed to connect to server: %v (Is the server running on :3001?)", err)
		}
	}

	fmt.Println("✅ Connected to Phalanx Duel API")
	if resp.HasMeta() && resp.Meta.HasConstraints() {
		c := resp.Meta.Constraints
		rows := c.GetRows()
		cols := c.GetColumns()
		fmt.Printf("📊 Constraints: Rows (%d-%d), Columns (%d-%d)\n",
			rows.GetMin(),
			rows.GetMax(),
			cols.GetMin(),
			cols.GetMax(),
		)
	}

	// 4. Connect to the live WebSocket protocol and print validActions from the first gameState.
	fmt.Printf("\n🔌 Connecting to WebSocket server at %s...\n", wsURL)
	creatorConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		log.Fatalf("❌ Failed to open creator socket: %v", err)
	}
	defer creatorConn.Close()

	joinerConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		log.Fatalf("❌ Failed to open joiner socket: %v", err)
	}
	defer joinerConn.Close()

	mustWriteJSON(creatorConn, createMatchRequest{
		Type:       "createMatch",
		PlayerName: "Go SDK Creator",
	})
	created := waitForMessage[matchCreatedMessage](creatorConn, "matchCreated")

	fmt.Printf("✅ Created match %s as player %d.\n", created.MatchID, created.PlayerIdx)

	mustWriteJSON(joinerConn, joinMatchRequest{
		Type:       "joinMatch",
		MatchID:    created.MatchID,
		PlayerName: "Go SDK Joiner",
	})
	_ = waitForMessage[wsEnvelope](joinerConn, "matchJoined")

	gameState := waitForMessage[gameStateMessage](creatorConn, "gameState")
	validActions := gameState.ViewModel.GetValidActions()

	fmt.Printf("🎯 Match %s is live. validActions (%d):\n", gameState.MatchID, len(validActions))
	for _, action := range validActions {
		fmt.Printf("   %s\n", actionSummary(action))
	}

	fmt.Println("\n🚀 SDK is functional and the live ViewModel is readable from Go.")
	os.Exit(0)
}
