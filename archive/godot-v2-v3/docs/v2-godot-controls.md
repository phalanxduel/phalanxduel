# Playing Phalanx Duel (Godot Port)

This guide documents the gameplay controls and interactions for the v2 Godot port of Phalanx Duel, ensuring visual and physical parity with the original browser-based reference.

## Interaction Model (Parity)
The v2 Godot port implements the same tactical interaction model as the v1 web client, optimized for both mouse/desktop and touch/mobile devices.

### Card Selection & Deployment
*   **Selection**: Click (mouse) or Tap (touch) a card in your **Hand** to select it. The selected card will be highlighted.
*   **Deployment**: After selecting a card, Click or Tap an available **Battlefield Cell** to deploy it.
*   **Cancellation**: Use the `CANCEL` button on the battlefield UI to deselect a card without deploying.

### Attacking & Combat
*   **Initiating Attack**: Select a unit on your **Front Rank**. Available attack targets on the opponent's side will be highlighted based on your unit's capability.
*   **Combat Preview**: The `COMBAT_PREVIEW` pill-label shows the potential outcome of your selected action before finalizing.
*   **Resolution**: Finalize your attack action through the main game interface.

### Turn Management
*   **Passing**: Use the `PASS` button to end your current phase or turn if no further actions are desired.
*   **Phases**: Monitor the `PHASE_INDICATOR` pill-label at the top of the battlefield to know whether you are in **Deployment**, **Attack**, or **Cleanup** phase.

## Visual Feedback (Combat Juice)
To maintain visual parity with the v1 browser experience, the Godot port includes procedural "Combat Juice":
*   **Screen Shake**: Triggered during major combat resolutions.
*   **Impact Flash**: A subtle red screen flash indicates when you or your units take damage.
*   **Particle Effects**: Localized particle bursts appear over cards when they take damage.

## Parity Verification
The v2 client interaction and visual events are governed by the same state-sync loop as v1. You can verify the gameplay state and event log consistency using the automated playthrough artifacts generated after every full match in Godot.
