class_name GameOverScreen
extends Control

const ThemeManager = preload("res://scripts/ThemeManager.gd")

signal play_again_requested()

var _status_label: Label
var _result_label: Label
var _summary_label: Label

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	
	var bg := ColorRect.new()
	bg.color = ThemeManager.get_color("bg")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 60)
	margin.add_theme_constant_override("margin_right", 60)
	margin.add_theme_constant_override("margin_top", 60)
	margin.add_theme_constant_override("margin_bottom", 60)
	add_child(margin)
	
	var vstack := VBoxContainer.new()
	vstack.add_theme_constant_override("separation", 20)
	vstack.alignment = BoxContainer.ALIGNMENT_CENTER
	margin.add_child(vstack)
	
	_status_label = Label.new()
	_status_label.text = "ENGAGEMENT_TERMINATED"
	_status_label.add_theme_font_size_override("font_size", 32)
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vstack.add_child(_status_label)
	
	_result_label = Label.new()
	_result_label.add_theme_font_size_override("font_size", 48)
	_result_label.add_theme_color_override("font_color", ThemeManager.get_color("blue"))
	_result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result_label.set_meta("data_test_id", "game-over-result")
	vstack.add_child(_result_label)
	
	_summary_label = Label.new()
	_summary_label.add_theme_font_size_override("font_size", 18)
	_summary_label.add_theme_color_override("font_color", ThemeManager.get_color("text_dim"))
	_summary_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vstack.add_child(_summary_label)
	
	var play_again_btn := Button.new()
	play_again_btn.text = "PLAY AGAIN"
	play_again_btn.custom_minimum_size = Vector2(200, 50)
	play_again_btn.set_meta("data_test_id", "play-again-btn")
	play_again_btn.pressed.connect(func(): emit_signal("play_again_requested"))
	vstack.add_child(play_again_btn)

func configure(state: Dictionary) -> void:
	if not is_node_ready():
		await ready
		
	var gs: Dictionary = state.get("game_view_state", {})
	var outcome: Dictionary = gs.get("outcome", {})
	var players: Array = gs.get("players", [])
	
	var winner_index := int(outcome.get("winnerIndex", -1))
	var winner_name := ""
	if winner_index >= 0 and winner_index < players.size():
		winner_name = str(players[winner_index].get("name", "PLAYER"))
	
	_result_label.text = "%s WINS!" % winner_name.to_upper()
	
	var lp_chunks: Array[String] = []
	for p in players:
		lp_chunks.append("%s: %d LP" % [str(p.get("name", "P")), int(p.get("lifepoints", 0))])
	
	_summary_label.text = " | ".join(lp_chunks)
