package main

import (
	"context"
	"fmt"
	"log"
	"os"

	phalanx "github.com/phalanxduel/game/sdk/go"
)

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

	// 4. Fetch Card Manifest (DiscoveryAPI)
	fmt.Println("\n🃏 Fetching card manifest...")
	manifest, _, err := client.DiscoveryAPI.ApiCardsManifestGet(context.Background()).Execute()
	if err != nil {
		log.Fatalf("❌ Failed to fetch manifest: %v", err)
	}

	fmt.Printf("✅ Loaded %d cards from manifest.\n", len(manifest))
	if len(manifest) > 0 {
		firstCard := manifest[0]
		fmt.Printf("   Example: %s of %s (Value: %d, Type: %s)\n", 
			firstCard.GetFace(),
			firstCard.GetSuit(),
			firstCard.GetValue(),
			firstCard.GetType(),
		)
	}

	fmt.Println("\n🚀 SDK is functional and type-safe!")
	os.Exit(0)
}
