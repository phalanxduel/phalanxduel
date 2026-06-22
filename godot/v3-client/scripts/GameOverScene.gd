extends Control

## Game Over — result display and restart

@onready var result_label: Label = $VBoxContainer/ResultLabel
@onready var restart_btn: Button = $VBoxContainer/RestartButton

func _ready() -> void:
	print("[GameOverScene] Ready")
	if result_label:
		result_label.text = "Game Over"
	if restart_btn:
		restart_btn.pressed.connect(_on_restart_pressed)

func _on_restart_pressed() -> void:
	print("[GameOverScene] Restart")
	get_tree().reload_current_scene()
