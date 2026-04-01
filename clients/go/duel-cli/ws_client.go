package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"math/rand"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	defaultHeartbeatInterval   = 30 * time.Second
	defaultHeartbeatTimeout    = 65 * time.Second
	defaultInitialReconnect    = 1 * time.Second
	defaultMaxReconnect        = 30 * time.Second
	defaultWriteDeadline       = 5 * time.Second
	defaultReconnectJitterFrac = 0.2
)

type connectionLifecycleState string

const (
	stateConnecting   connectionLifecycleState = "CONNECTING"
	stateOpen         connectionLifecycleState = "OPEN"
	stateDisconnected connectionLifecycleState = "DISCONNECTED"
)

type wsTransportMessage struct {
	Envelope wsEnvelope
	Payload  []byte
}

type rejoinMatchRequest struct {
	Type     string `json:"type"`
	MsgID    string `json:"msgId"`
	MatchID  string `json:"matchId"`
	PlayerID string `json:"playerId"`
}

type transportAckMessage struct {
	Type       string `json:"type"`
	MsgID      string `json:"msgId"`
	AckedMsgID string `json:"ackedMsgId"`
}

type transportPingMessage struct {
	Type      string `json:"type"`
	MsgID     string `json:"msgId"`
	Timestamp string `json:"timestamp"`
}

type transportPongMessage struct {
	Type      string `json:"type"`
	MsgID     string `json:"msgId"`
	Timestamp string `json:"timestamp"`
	ReplyTo   string `json:"replyTo,omitempty"`
}

type transportEnvelope struct {
	Type       string `json:"type"`
	MsgID      string `json:"msgId,omitempty"`
	AckedMsgID string `json:"ackedMsgId,omitempty"`
}

type pendingMessage struct {
	MessageType string
	Payload     []byte
}

type matchSession struct {
	MatchID  string
	PlayerID string
}

type wsClientConfig struct {
	HeartbeatInterval    time.Duration
	HeartbeatTimeout     time.Duration
	InitialReconnect     time.Duration
	MaxReconnect         time.Duration
	ReconnectJitterRatio float64
	RandomFloat          func() float64
	Logf                 func(format string, args ...any)
}

type wsClient struct {
	url    string
	origin string
	config wsClientConfig

	incoming chan wsTransportMessage
	stopCh   chan struct{}
	doneCh   chan struct{}

	mu                sync.Mutex
	writeMu           sync.Mutex
	conn              *websocket.Conn
	state             connectionLifecycleState
	shouldReconnect   bool
	awaitingResync    bool
	reconnectDelay    time.Duration
	reconnectAttempt  int
	lastServerMessage time.Time
	session           matchSession
	pending           map[string]pendingMessage
	pendingOrder      []string
}

func newWSClient(url string, origin string) *wsClient {
	return newWSClientWithConfig(url, origin, wsClientConfig{})
}

func newWSClientWithConfig(url string, origin string, config wsClientConfig) *wsClient {
	if config.HeartbeatInterval <= 0 {
		config.HeartbeatInterval = defaultHeartbeatInterval
	}
	if config.HeartbeatTimeout <= 0 {
		config.HeartbeatTimeout = defaultHeartbeatTimeout
	}
	if config.InitialReconnect <= 0 {
		config.InitialReconnect = defaultInitialReconnect
	}
	if config.MaxReconnect <= 0 {
		config.MaxReconnect = defaultMaxReconnect
	}
	if config.ReconnectJitterRatio <= 0 {
		config.ReconnectJitterRatio = defaultReconnectJitterFrac
	}
	if config.RandomFloat == nil {
		config.RandomFloat = rand.Float64
	}
	if config.Logf == nil {
		config.Logf = func(format string, args ...any) {
			fmt.Printf(format+"\n", args...)
		}
	}

	return &wsClient{
		url:             url,
		origin:          origin,
		config:          config,
		incoming:        make(chan wsTransportMessage, 64),
		stopCh:          make(chan struct{}),
		doneCh:          make(chan struct{}),
		shouldReconnect: true,
		reconnectDelay:  config.InitialReconnect,
		pending:         make(map[string]pendingMessage),
	}
}

func (c *wsClient) Messages() <-chan wsTransportMessage {
	return c.incoming
}

func (c *wsClient) Start() {
	go c.run()
}

func (c *wsClient) Close() {
	c.mu.Lock()
	if !c.shouldReconnect {
		c.mu.Unlock()
		return
	}
	c.shouldReconnect = false
	conn := c.conn
	c.conn = nil
	c.mu.Unlock()

	close(c.stopCh)
	if conn != nil {
		_ = conn.Close()
	}
	<-c.doneCh
}

func (c *wsClient) SendCreateMatch(playerName string, opponent string) error {
	return c.sendReliablePayload(
		createMatchRequest{
			Type:       "createMatch",
			MsgID:      newMessageID(),
			PlayerName: playerName,
			Opponent:   opponent,
		},
		"",
	)
}

func (c *wsClient) SendJoinMatch(matchID string, playerName string) error {
	return c.sendReliablePayload(
		joinMatchRequest{
			Type:       "joinMatch",
			MsgID:      newMessageID(),
			MatchID:    matchID,
			PlayerName: playerName,
		},
		"",
	)
}

func (c *wsClient) SendAction(matchID string, action json.RawMessage) error {
	return c.sendReliablePayload(
		actionRequest{
			Type:    "action",
			MsgID:   newMessageID(),
			MatchID: matchID,
			Action:  action,
		},
		"",
	)
}

func (c *wsClient) run() {
	defer close(c.doneCh)
	defer close(c.incoming)

	for {
		if !c.keepRunning() {
			return
		}

		c.setState(stateConnecting)
		conn, err := c.dial()
		if err != nil {
			c.logf("⚠️ WebSocket connect failed: %v", err)
			c.setState(stateDisconnected)
			if !c.waitForReconnect() {
				return
			}
			continue
		}

		c.handleOpen(conn)
		runErr := c.runConnection(conn)
		if !c.keepRunning() {
			return
		}
		if runErr != nil && !websocket.IsCloseError(runErr, websocket.CloseNormalClosure) {
			c.logf("⚠️ WebSocket disconnected: %v", runErr)
		}
		c.setState(stateDisconnected)
		if !c.waitForReconnect() {
			return
		}
	}
}

func (c *wsClient) keepRunning() bool {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.shouldReconnect
}

func (c *wsClient) dial() (*websocket.Conn, error) {
	conn, _, err := websocket.DefaultDialer.Dial(c.url, http.Header{
		"Origin": []string{c.origin},
	})
	if err != nil {
		return nil, err
	}
	return conn, nil
}

func (c *wsClient) handleOpen(conn *websocket.Conn) {
	c.mu.Lock()
	c.conn = conn
	c.lastServerMessage = time.Now()
	c.reconnectDelay = c.config.InitialReconnect
	c.mu.Unlock()

	conn.SetPongHandler(func(appData string) error {
		c.noteServerActivity()
		return nil
	})
	conn.SetPingHandler(func(appData string) error {
		c.noteServerActivity()
		c.writeMu.Lock()
		defer c.writeMu.Unlock()
		return conn.WriteControl(
			websocket.PongMessage,
			[]byte(appData),
			time.Now().Add(defaultWriteDeadline),
		)
	})

	c.setState(stateOpen)
	c.bootstrapConnection()
}

func (c *wsClient) runConnection(conn *websocket.Conn) error {
	heartbeatDone := make(chan struct{})
	defer close(heartbeatDone)
	go c.heartbeatLoop(conn, heartbeatDone)

	for {
		_, payload, err := conn.ReadMessage()
		if err != nil {
			c.clearConnection(conn)
			return err
		}
		c.noteServerActivity()

		message, handled, err := c.handleInbound(payload)
		if err != nil {
			return err
		}
		if handled {
			continue
		}

		select {
		case c.incoming <- message:
		case <-c.stopCh:
			return nil
		}
	}
}

func (c *wsClient) heartbeatLoop(conn *websocket.Conn, done <-chan struct{}) {
	pingTicker := time.NewTicker(c.config.HeartbeatInterval)
	watchdogTicker := time.NewTicker(5 * time.Second)
	defer pingTicker.Stop()
	defer watchdogTicker.Stop()

	for {
		select {
		case <-done:
			return
		case <-c.stopCh:
			return
		case <-pingTicker.C:
			_ = c.sendTransportPayload(transportPingMessage{
				Type:      "ping",
				MsgID:     newMessageID(),
				Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
			})
		case <-watchdogTicker.C:
			if time.Since(c.lastActivity()) > c.config.HeartbeatTimeout {
				c.logf("⚠️ Heartbeat timed out. Reconnecting...")
				_ = conn.Close()
				return
			}
		}
	}
}

func (c *wsClient) bootstrapConnection() {
	c.mu.Lock()
	session := c.session
	if session.MatchID != "" && session.PlayerID != "" {
		c.awaitingResync = true
		c.mu.Unlock()
		_ = c.sendReliablePayloadImmediately(
			rejoinMatchRequest{
				Type:     "rejoinMatch",
				MsgID:    newMessageID(),
				MatchID:  session.MatchID,
				PlayerID: session.PlayerID,
			},
			"rejoinMatch",
		)
		return
	}

	c.awaitingResync = false
	payloads := c.pendingPayloadsLocked("")
	c.mu.Unlock()
	c.writePendingPayloads(payloads)
}

func (c *wsClient) sendReliablePayload(payload any, replaceType string) error {
	encoded, shouldSend, err := c.enqueueReliablePayload(payload, replaceType, false)
	if err != nil {
		return err
	}
	if shouldSend {
		return c.writePayload(encoded)
	}
	return nil
}

func (c *wsClient) sendReliablePayloadImmediately(payload any, replaceType string) error {
	encoded, shouldSend, err := c.enqueueReliablePayload(payload, replaceType, true)
	if err != nil {
		return err
	}
	if shouldSend {
		return c.writePayload(encoded)
	}
	return nil
}

func (c *wsClient) enqueueReliablePayload(
	payload any,
	replaceType string,
	forceSend bool,
) ([]byte, bool, error) {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return nil, false, err
	}

	var envelope transportEnvelope
	if err := json.Unmarshal(encoded, &envelope); err != nil {
		return nil, false, err
	}
	if envelope.Type == "" || envelope.MsgID == "" {
		return nil, false, errors.New("reliable transport payload requires type and msgId")
	}

	c.mu.Lock()
	if replaceType != "" {
		c.removePendingByTypeLocked(replaceType)
	}
	if _, exists := c.pending[envelope.MsgID]; !exists {
		c.pendingOrder = append(c.pendingOrder, envelope.MsgID)
	}
	c.pending[envelope.MsgID] = pendingMessage{
		MessageType: envelope.Type,
		Payload:     encoded,
	}
	shouldSend := c.state == stateOpen && (forceSend || !c.awaitingResync)
	c.mu.Unlock()

	return encoded, shouldSend, nil
}

func (c *wsClient) sendTransportPayload(payload any) error {
	encoded, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	return c.writePayload(encoded)
}

func (c *wsClient) writePayload(payload []byte) error {
	c.mu.Lock()
	conn := c.conn
	c.mu.Unlock()
	if conn == nil {
		return nil
	}

	c.writeMu.Lock()
	defer c.writeMu.Unlock()

	_ = conn.SetWriteDeadline(time.Now().Add(defaultWriteDeadline))
	if err := conn.WriteMessage(websocket.TextMessage, payload); err != nil {
		_ = conn.Close()
		return err
	}
	return nil
}

func (c *wsClient) handleInbound(payload []byte) (wsTransportMessage, bool, error) {
	var envelope transportEnvelope
	if err := json.Unmarshal(payload, &envelope); err != nil {
		return wsTransportMessage{}, true, nil
	}
	if envelope.Type == "" {
		return wsTransportMessage{}, true, nil
	}

	if envelope.MsgID != "" && envelope.Type != "ack" {
		_ = c.sendTransportPayload(transportAckMessage{
			Type:       "ack",
			MsgID:      newMessageID(),
			AckedMsgID: envelope.MsgID,
		})
	}

	switch envelope.Type {
	case "ack":
		if envelope.AckedMsgID != "" {
			c.mu.Lock()
			c.removePendingLocked(envelope.AckedMsgID)
			c.mu.Unlock()
		}
		return wsTransportMessage{}, true, nil
	case "ping":
		_ = c.sendTransportPayload(transportPongMessage{
			Type:      "pong",
			MsgID:     newMessageID(),
			Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
			ReplyTo:   envelope.MsgID,
		})
		return wsTransportMessage{}, true, nil
	case "pong":
		return wsTransportMessage{}, true, nil
	}

	switch envelope.Type {
	case "matchCreated":
		created := decodePayload[matchCreatedMessage](payload, envelope.Type)
		c.mu.Lock()
		c.session = matchSession{MatchID: created.MatchID, PlayerID: created.PlayerID}
		c.awaitingResync = false
		payloads := c.pendingPayloadsLocked("createMatch")
		c.mu.Unlock()
		c.writePendingPayloads(payloads)
	case "matchJoined":
		joined := decodePayload[matchJoinedMessage](payload, envelope.Type)
		c.mu.Lock()
		c.session = matchSession{MatchID: joined.MatchID, PlayerID: joined.PlayerID}
		c.awaitingResync = false
		payloads := c.pendingPayloadsLocked("rejoinMatch", "joinMatch")
		c.mu.Unlock()
		c.writePendingPayloads(payloads)
	}

	return wsTransportMessage{
		Envelope: wsEnvelope{Type: envelope.Type},
		Payload:  payload,
	}, false, nil
}

func (c *wsClient) waitForReconnect() bool {
	delay := c.nextReconnectDelay()
	c.logf("↻ Reconnecting in %s...", delay.Round(time.Millisecond))

	timer := time.NewTimer(delay)
	defer timer.Stop()

	select {
	case <-c.stopCh:
		return false
	case <-timer.C:
		return c.keepRunning()
	}
}

func (c *wsClient) nextReconnectDelay() time.Duration {
	c.mu.Lock()
	defer c.mu.Unlock()

	baseDelay := c.reconnectDelay
	jitter := time.Duration(float64(baseDelay) * c.config.ReconnectJitterRatio * c.config.RandomFloat())
	delay := baseDelay + jitter
	if delay > c.config.MaxReconnect {
		delay = c.config.MaxReconnect
	}

	nextDelay := c.reconnectDelay * 2
	if nextDelay > c.config.MaxReconnect {
		nextDelay = c.config.MaxReconnect
	}
	c.reconnectDelay = nextDelay
	c.reconnectAttempt++

	return delay
}

func (c *wsClient) clearConnection(conn *websocket.Conn) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.conn == conn {
		c.conn = nil
	}
}

func (c *wsClient) noteServerActivity() {
	c.mu.Lock()
	c.lastServerMessage = time.Now()
	c.mu.Unlock()
}

func (c *wsClient) lastActivity() time.Time {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.lastServerMessage
}

func (c *wsClient) setState(state connectionLifecycleState) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.state == state {
		return
	}
	c.state = state
	switch state {
	case stateConnecting:
		c.config.Logf("🔌 WebSocket state: CONNECTING")
	case stateOpen:
		c.config.Logf("✅ WebSocket state: OPEN")
	case stateDisconnected:
		c.config.Logf("⚠️ WebSocket state: DISCONNECTED")
	}
}

func (c *wsClient) logf(format string, args ...any) {
	c.config.Logf(format, args...)
}

func (c *wsClient) pendingPayloadsLocked(excludeTypes ...string) [][]byte {
	excluded := make(map[string]struct{}, len(excludeTypes))
	for _, messageType := range excludeTypes {
		excluded[messageType] = struct{}{}
	}

	payloads := make([][]byte, 0, len(c.pendingOrder))
	for _, msgID := range c.pendingOrder {
		entry, ok := c.pending[msgID]
		if !ok {
			continue
		}
		if _, skip := excluded[entry.MessageType]; skip {
			continue
		}
		payloads = append(payloads, append([]byte(nil), entry.Payload...))
	}
	return payloads
}

func (c *wsClient) writePendingPayloads(payloads [][]byte) {
	for _, payload := range payloads {
		if err := c.writePayload(payload); err != nil {
			return
		}
	}
}

func (c *wsClient) removePendingLocked(msgID string) {
	delete(c.pending, msgID)
	filtered := c.pendingOrder[:0]
	for _, existing := range c.pendingOrder {
		if existing != msgID {
			filtered = append(filtered, existing)
		}
	}
	c.pendingOrder = filtered
}

func (c *wsClient) removePendingByTypeLocked(messageType string) {
	for msgID, entry := range c.pending {
		if entry.MessageType == messageType {
			delete(c.pending, msgID)
		}
	}
	filtered := c.pendingOrder[:0]
	for _, msgID := range c.pendingOrder {
		entry, ok := c.pending[msgID]
		if ok && entry.MessageType == messageType {
			continue
		}
		if ok {
			filtered = append(filtered, msgID)
		}
	}
	c.pendingOrder = filtered
}
