package main

import (
	"encoding/json"
	"testing"
)

func TestDeriveWebSocketURL(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "http", in: "http://127.0.0.1:3001", want: "ws://127.0.0.1:3001/ws"},
		{name: "https", in: "https://play.phalanxduel.com", want: "wss://play.phalanxduel.com/ws"},
		{name: "ws", in: "ws://example.test", want: "ws://example.test/ws"},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := deriveWebSocketURL(tt.in); got != tt.want {
				t.Fatalf("deriveWebSocketURL(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestWebsocketOrigin(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		in   string
		want string
	}{
		{name: "ws", in: "ws://127.0.0.1:3001", want: "http://127.0.0.1:3001"},
		{name: "wss", in: "wss://play.phalanxduel.com", want: "https://play.phalanxduel.com"},
		{name: "http passthrough", in: "http://127.0.0.1:3001", want: "http://127.0.0.1:3001"},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := websocketOrigin(tt.in); got != tt.want {
				t.Fatalf("websocketOrigin(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestBuildPlayLink(t *testing.T) {
	t.Parallel()

	got := buildPlayLink("http://127.0.0.1:3001/api", "123e4567-e89b-12d3-a456-426614174000")
	want := "http://127.0.0.1:3001/?match=123e4567-e89b-12d3-a456-426614174000"
	if got != want {
		t.Fatalf("buildPlayLink() = %q, want %q", got, want)
	}
}

func TestParseMatchReference(t *testing.T) {
	t.Parallel()

	want := "123e4567-e89b-42d3-a456-426614174000"
	got := parseMatchReference("http://127.0.0.1:3001/?match=" + want)
	if got != want {
		t.Fatalf("parseMatchReference() = %q, want %q", got, want)
	}
}

func TestActionTypeAndSummary(t *testing.T) {
	t.Parallel()

	raw := json.RawMessage(`{"type":"attack","attackingColumn":1,"defendingColumn":0}`)
	if got := actionType(raw); got != "attack" {
		t.Fatalf("actionType() = %q, want attack", got)
	}
	if got := actionSummary(raw); got != "Attack with column 1 vs column 0" {
		t.Fatalf("actionSummary() = %q, want \"Attack with column 1 vs column 0\"", got)
	}
}
