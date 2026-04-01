package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

func TestWSClientRejoinsAndReplaysPendingAction(t *testing.T) {
	t.Parallel()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	const matchID = "123e4567-e89b-42d3-a456-426614174000"
	const playerID = "123e4567-e89b-42d3-a456-426614174001"

	var mu sync.Mutex
	connectionCount := 0
	firstActionMsgID := ""
	replayedActionMsgID := make(chan string, 1)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("upgrade failed: %v", err)
			return
		}

		mu.Lock()
		connectionCount++
		currentConnection := connectionCount
		mu.Unlock()

		go func() {
			defer conn.Close()
			for {
				_, payload, err := conn.ReadMessage()
				if err != nil {
					return
				}

				var envelope transportEnvelope
				if err := json.Unmarshal(payload, &envelope); err != nil {
					t.Errorf("unmarshal failed: %v", err)
					return
				}

				switch currentConnection {
				case 1:
					switch envelope.Type {
					case "createMatch":
						_ = conn.WriteJSON(transportAckMessage{
							Type:       "ack",
							MsgID:      newMessageID(),
							AckedMsgID: envelope.MsgID,
						})
						_ = conn.WriteJSON(matchCreatedMessage{
							Type:      "matchCreated",
							MatchID:   matchID,
							PlayerID:  playerID,
							PlayerIdx: 0,
						})
					case "action":
						firstActionMsgID = envelope.MsgID
						_ = conn.Close()
						return
					}
				case 2:
					switch envelope.Type {
					case "rejoinMatch":
						_ = conn.WriteJSON(transportAckMessage{
							Type:       "ack",
							MsgID:      newMessageID(),
							AckedMsgID: envelope.MsgID,
						})
						_ = conn.WriteJSON(matchJoinedMessage{
							Type:      "matchJoined",
							MatchID:   matchID,
							PlayerID:  playerID,
							PlayerIdx: 0,
						})
					case "action":
						replayedActionMsgID <- envelope.MsgID
						return
					}
				}
			}
		}()
	}))
	defer server.Close()

	client := newWSClientWithConfig(
		deriveWebSocketURL(server.URL),
		server.URL,
		wsClientConfig{
			HeartbeatInterval: 1 * time.Hour,
			HeartbeatTimeout:  2 * time.Hour,
			InitialReconnect:  10 * time.Millisecond,
			MaxReconnect:      20 * time.Millisecond,
			RandomFloat:       func() float64 { return 0 },
			Logf:              func(string, ...any) {},
		},
	)
	client.Start()
	defer client.Close()

	if err := client.SendCreateMatch("Alice", ""); err != nil {
		t.Fatalf("SendCreateMatch() error = %v", err)
	}

	message := waitForTransportMessage(t, client.Messages(), "matchCreated")
	created := decodePayload[matchCreatedMessage](message.Payload, message.Envelope.Type)

	if err := client.SendAction(
		created.MatchID,
		json.RawMessage(`{"type":"forfeit","playerIndex":0,"timestamp":"2026-04-01T12:00:00.000Z"}`),
	); err != nil {
		t.Fatalf("SendAction() error = %v", err)
	}

	select {
	case replayedMsgID := <-replayedActionMsgID:
		if replayedMsgID == "" {
			t.Fatal("replayed action msgId should not be empty")
		}
		if replayedMsgID != firstActionMsgID {
			t.Fatalf("replayed action msgId = %q, want %q", replayedMsgID, firstActionMsgID)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timed out waiting for replayed action")
	}
}

func TestWSClientDoesNotReplayAckedAction(t *testing.T) {
	t.Parallel()

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	const matchID = "123e4567-e89b-42d3-a456-426614174010"
	const playerID = "123e4567-e89b-42d3-a456-426614174011"

	var mu sync.Mutex
	connectionCount := 0
	unexpectedReplay := make(chan string, 1)

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Errorf("upgrade failed: %v", err)
			return
		}

		mu.Lock()
		connectionCount++
		currentConnection := connectionCount
		mu.Unlock()

		go func() {
			defer conn.Close()
			for {
				_, payload, err := conn.ReadMessage()
				if err != nil {
					return
				}

				var envelope transportEnvelope
				if err := json.Unmarshal(payload, &envelope); err != nil {
					t.Errorf("unmarshal failed: %v", err)
					return
				}

				switch currentConnection {
				case 1:
					switch envelope.Type {
					case "createMatch":
						_ = conn.WriteJSON(transportAckMessage{
							Type:       "ack",
							MsgID:      newMessageID(),
							AckedMsgID: envelope.MsgID,
						})
						_ = conn.WriteJSON(matchCreatedMessage{
							Type:      "matchCreated",
							MatchID:   matchID,
							PlayerID:  playerID,
							PlayerIdx: 0,
						})
					case "action":
						_ = conn.WriteJSON(transportAckMessage{
							Type:       "ack",
							MsgID:      newMessageID(),
							AckedMsgID: envelope.MsgID,
						})
						_ = conn.Close()
						return
					}
				case 2:
					switch envelope.Type {
					case "rejoinMatch":
						_ = conn.WriteJSON(transportAckMessage{
							Type:       "ack",
							MsgID:      newMessageID(),
							AckedMsgID: envelope.MsgID,
						})
						_ = conn.WriteJSON(matchJoinedMessage{
							Type:      "matchJoined",
							MatchID:   matchID,
							PlayerID:  playerID,
							PlayerIdx: 0,
						})
					case "action":
						unexpectedReplay <- envelope.MsgID
						return
					}
				}
			}
		}()
	}))
	defer server.Close()

	client := newWSClientWithConfig(
		deriveWebSocketURL(server.URL),
		server.URL,
		wsClientConfig{
			HeartbeatInterval: 1 * time.Hour,
			HeartbeatTimeout:  2 * time.Hour,
			InitialReconnect:  10 * time.Millisecond,
			MaxReconnect:      20 * time.Millisecond,
			RandomFloat:       func() float64 { return 0 },
			Logf:              func(string, ...any) {},
		},
	)
	client.Start()
	defer client.Close()

	if err := client.SendCreateMatch("Alice", ""); err != nil {
		t.Fatalf("SendCreateMatch() error = %v", err)
	}

	message := waitForTransportMessage(t, client.Messages(), "matchCreated")
	created := decodePayload[matchCreatedMessage](message.Payload, message.Envelope.Type)

	if err := client.SendAction(
		created.MatchID,
		json.RawMessage(`{"type":"forfeit","playerIndex":0,"timestamp":"2026-04-01T12:00:00.000Z"}`),
	); err != nil {
		t.Fatalf("SendAction() error = %v", err)
	}

	waitForTransportMessage(t, client.Messages(), "matchJoined")

	select {
	case msgID := <-unexpectedReplay:
		t.Fatalf("unexpected replay for acked action msgId %q", msgID)
	case <-time.After(250 * time.Millisecond):
	}
}

func waitForTransportMessage(
	t *testing.T,
	messages <-chan wsTransportMessage,
	messageType string,
) wsTransportMessage {
	t.Helper()

	timeout := time.NewTimer(2 * time.Second)
	defer timeout.Stop()

	for {
		select {
		case message, ok := <-messages:
			if !ok {
				t.Fatalf("message channel closed while waiting for %s", messageType)
			}
			if message.Envelope.Type == messageType {
				return message
			}
		case <-timeout.C:
			t.Fatalf("timed out waiting for %s", messageType)
		}
	}
}
