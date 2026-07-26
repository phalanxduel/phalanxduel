---
id: TASK-368
title: SwiftUI real StoreKit purchase flow (remove simulatePurchase from shipped UI)
status: To Do
assignee: []
created_date: '2026-07-26 15:49'
labels:
  - swiftui
  - app-store-readiness
  - storekit
dependencies: []
references:
  - 'game-swiftui:PhalanxDuelClient/UI/StoreView.swift'
  - 'game-swiftui:PhalanxDuelClient/Domain/StoreManager.swift'
  - 'game-swiftui:PhalanxDuelClient/PhalanxStore.storekit'
priority: high
type: bug
ordinal: 235800
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`StoreView`'s `ProductCardView` buy button calls `storeManager.simulatePurchase(item:)`, not the real `StoreManager.purchase(_:Product)` sitting right next to it in the same file. `simulatePurchase` fabricates a fake transaction ID (`"sim_\(UUID().uuidString)"`), never invokes `Product.purchase()`, and never shows Apple's payment sheet — it locally marks the item owned and POSTs a synthetic transaction ID to the server. Shipped as-is, this either does nothing purchasable or grants paid items for free; it would also almost certainly fail App Review, which tests real IAP flows.

The real path already exists and is correctly implemented: StoreKit 2 transaction verification (`checkVerified`), entitlement sync, `Transaction.updates` listening, a real local `.storekit` test catalog (`PhalanxDuelClient/PhalanxStore.storekit`) properly wired into the Xcode scheme (`project.yml`'s `storeKitConfiguration:`). `storeKitProducts: [Product]` is even fetched from StoreKit — it's just never rendered or used by the UI, which iterates the separate `availableProducts: [StoreProductItem]` catalog instead.

Surfaced during an App-Store-readiness research pass alongside TASK-366, TASK-367, TASK-369 through TASK-373.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 #1 ProductCardView's buy button resolves the matching StoreKit Product (by sku) from storeManager.storeKitProducts and calls the real purchase(_:) method, showing Apple's payment sheet
- [ ] #2 #2 simulatePurchase is removed from the shipped UI path entirely (kept only if genuinely needed for local/XCUITest fixtures, clearly separated from production code and never reachable from a real build)
- [ ] #3 #3 Purchase failure, cancellation, and pending states are all surfaced to the player (not just success)
- [ ] #4 #4 Verified against the local .storekit test configuration in Xcode (real sandboxed purchase flow, not simulatePurchase's fake transaction ID) before considered done
<!-- AC:END -->

## Definition of Done
<!-- DOD:BEGIN -->
- [ ] #1 Code builds without errors (pnpm build)
- [ ] #2 Linting and typechecking pass (pnpm lint and pnpm typecheck)
- [ ] #3 All unit and integration tests pass (pnpm test:run:all)
- [ ] #4 API schemas and types are re-generated and verified (pnpm schema:gen and scripts/ci/verify-schema.sh)
- [ ] #5 Documentation artifacts are updated (pnpm docs:artifacts)
- [ ] #6 Automated verification scripts pass (FSM consistency and event log coverage)
<!-- DOD:END -->
