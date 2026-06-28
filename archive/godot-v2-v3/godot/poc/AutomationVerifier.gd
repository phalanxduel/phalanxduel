class_name AutomationVerifier
extends Node

func verify_checkpoint(store: GameViewStore, expected_checkpoint: String) -> bool:
    print("Verifying checkpoint: ", expected_checkpoint)
    var result = store.automation_checkpoint == expected_checkpoint
    if result:
        print("Checkpoint verified successfully.")
    else:
        print("Checkpoint verification failed. Expected: ", expected_checkpoint, ", Actual: ", store.automation_checkpoint)
    return result
