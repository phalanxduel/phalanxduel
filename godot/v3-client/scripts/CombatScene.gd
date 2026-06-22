extends Control

## Combat Phase — attack/reinforce/draw actions

@onready var action_panel: HBoxContainer = $VBoxContainer/ActionPanel
@onready var attack_btn: Button = $VBoxContainer/ActionPanel/AttackButton
@onready var pass_btn: Button = $VBoxContainer/ActionPanel/PassButton
@onready var turn_label: Label = $VBoxContainer/TurnLabel

var turn_count: int = 0

func _ready() -> void:
	print("[CombatScene] Ready")
	if attack_btn:
		attack_btn.pressed.connect(_on_attack_pressed)
	if pass_btn:
		pass_btn.pressed.connect(_on_pass_pressed)
	_update_turn_display()

func _update_turn_display() -> void:
	turn_count += 1
	if turn_label:
		turn_label.text = "Turn %d" % turn_count

func _on_attack_pressed() -> void:
	print("[CombatScene] Attack action")
	# In full implementation: show target selection, apply attack, resolve

func _on_pass_pressed() -> void:
	print("[CombatScene] Pass")
	# Advance through phases: AttackResolution → Cleanup → Reinforce → Draw → EndTurn
	var state_machine = get_node("/root/MatchRoot/GameStateMachine")
	state_machine.transition_to("AttackResolution")
	await get_tree().create_timer(0.5).timeout
	state_machine.transition_to("CleanupPhase")
	await get_tree().create_timer(0.5).timeout
	state_machine.transition_to("ReinforcementPhase")
	await get_tree().create_timer(0.5).timeout
	state_machine.transition_to("DrawPhase")
	await get_tree().create_timer(0.5).timeout
	state_machine.transition_to("EndTurn")
	await get_tree().create_timer(0.5).timeout
	state_machine.transition_to("StartTurn")
	await get_tree().create_timer(0.5).timeout
	state_machine.transition_to("AttackPhase")
	_update_turn_display()
