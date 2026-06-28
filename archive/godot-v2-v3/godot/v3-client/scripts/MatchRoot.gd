extends Control

## Main game orchestrator — manages scene transitions and game flow

@onready var state_machine: Node = $GameStateMachine
@onready var current_scene: Control = null

# Scene references (loaded on demand)
var lobby_scene: PackedScene
var deployment_scene: PackedScene
var combat_scene: PackedScene
var game_over_scene: PackedScene

# Game state
var current_phase: String = "StartTurn"

func _ready() -> void:
	# Load scene resources
	lobby_scene = preload("res://scenes/LobbyScene.tscn")
	deployment_scene = preload("res://scenes/DeploymentScene.tscn")
	combat_scene = preload("res://scenes/CombatScene.tscn")
	game_over_scene = preload("res://scenes/GameOverScene.tscn")

	# Connect state machine signals
	state_machine.phase_changed.connect(_on_phase_changed)
	state_machine.game_over.connect(_on_game_over)

	# Start game flow
	_show_lobby()

func _show_lobby() -> void:
	_clear_current_scene()
	current_scene = lobby_scene.instantiate()
	add_child(current_scene)
	print("[MatchRoot] Showing lobby")

func _show_deployment() -> void:
	_clear_current_scene()
	current_scene = deployment_scene.instantiate()
	add_child(current_scene)
	print("[MatchRoot] Showing deployment")

func _show_combat() -> void:
	_clear_current_scene()
	current_scene = combat_scene.instantiate()
	add_child(current_scene)
	print("[MatchRoot] Showing combat")

func _show_game_over() -> void:
	_clear_current_scene()
	current_scene = game_over_scene.instantiate()
	add_child(current_scene)
	print("[MatchRoot] Showing game over")

func _clear_current_scene() -> void:
	if current_scene:
		current_scene.queue_free()
		current_scene = null

func _on_phase_changed(phase: String) -> void:
	current_phase = phase
	print("[MatchRoot] Phase changed: %s" % phase)

	match phase:
		"StartTurn":
			pass  # Bookkeeping, no scene change
		"DeploymentPhase":
			_show_deployment()
		"AttackPhase":
			_show_combat()
		"AttackResolution":
			pass  # Combat scene updates
		"CleanupPhase":
			pass  # Combat scene updates
		"ReinforcementPhase":
			pass  # Combat scene updates
		"DrawPhase":
			pass  # Combat scene updates
		"EndTurn":
			pass  # Bookkeeping, no scene change
		"gameOver":
			_show_game_over()

func _on_game_over(winner: int) -> void:
	print("[MatchRoot] Game over. Winner: player %d" % winner)
	state_machine.transition_to("gameOver")
