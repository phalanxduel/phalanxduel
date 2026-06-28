extends Node

## Manages game phase transitions per engine/src/state-machine.ts
## Canonical phases: StartTurn → DeploymentPhase → AttackPhase → AttackResolution →
##                 CleanupPhase → ReinforcementPhase → DrawPhase → EndTurn → gameOver

signal phase_changed(phase: String)
signal turn_started(turn_number: int)
signal turn_ended(turn_number: int)
signal game_over(winner: int)

var current_phase: String = "StartTurn"
var current_turn: int = 0
var active_player: int = 0

func _ready() -> void:
	pass

func transition_to(new_phase: String) -> void:
	if _is_valid_transition(current_phase, new_phase):
		print("[GameStateMachine] %s → %s" % [current_phase, new_phase])
		current_phase = new_phase
		phase_changed.emit(current_phase)

		# Handle turn boundaries
		if new_phase == "StartTurn":
			current_turn += 1
			turn_started.emit(current_turn)
		elif new_phase == "EndTurn":
			turn_ended.emit(current_turn)
		elif new_phase == "gameOver":
			game_over.emit(active_player)
	else:
		push_error("Invalid transition: %s → %s" % [current_phase, new_phase])

func _is_valid_transition(from: String, to: String) -> bool:
	# Simplified validation — full FSM in engine/src/state-machine.ts
	match from:
		"StartTurn":
			return to in ["DeploymentPhase", "AttackPhase", "gameOver"]
		"DeploymentPhase":
			return to in ["DeploymentPhase", "AttackPhase", "gameOver"]
		"AttackPhase":
			return to in ["AttackResolution", "gameOver"]
		"AttackResolution":
			return to in ["CleanupPhase", "gameOver"]
		"CleanupPhase":
			return to in ["ReinforcementPhase", "gameOver"]
		"ReinforcementPhase":
			return to in ["ReinforcementPhase", "DrawPhase", "gameOver"]
		"DrawPhase":
			return to in ["EndTurn", "gameOver"]
		"EndTurn":
			return to in ["StartTurn", "gameOver"]
	return false

func get_valid_transitions() -> PackedStringArray:
	match current_phase:
		"StartTurn":
			return ["DeploymentPhase", "AttackPhase", "gameOver"]
		"DeploymentPhase":
			return ["DeploymentPhase", "AttackPhase", "gameOver"]
		"AttackPhase":
			return ["AttackResolution", "gameOver"]
		"AttackResolution":
			return ["CleanupPhase", "gameOver"]
		"CleanupPhase":
			return ["ReinforcementPhase", "gameOver"]
		"ReinforcementPhase":
			return ["ReinforcementPhase", "DrawPhase", "gameOver"]
		"DrawPhase":
			return ["EndTurn", "gameOver"]
		"EndTurn":
			return ["StartTurn", "gameOver"]
	return []
