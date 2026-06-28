extends Control

## Lobby — player name entry and quick match button

@onready var name_input: LineEdit = $VBoxContainer/NameInput
@onready var quick_match_btn: Button = $VBoxContainer/QuickMatchButton

func _ready() -> void:
	if name_input:
		name_input.text = "Player"
		name_input.grab_focus()
	if quick_match_btn:
		quick_match_btn.pressed.connect(_on_quick_match_pressed)

func _on_quick_match_pressed() -> void:
	var player_name = name_input.text if name_input else "Player"
	print("[LobbyScene] Quick match: %s" % player_name)
	# Trigger game start — transition to deployment
	get_node("/root/MatchRoot/GameStateMachine").transition_to("DeploymentPhase")
