class_name GameOverScreen
extends Control

const ThemeManager = preload("res://scripts/ThemeManager.gd")

signal play_again_requested()

var _status_label: Label
var _result_label: Label
var _outcome_label: Label
var _summary_label: Label
var _turning_point_panel: PanelContainer
var _turning_point_label: Label
var _turning_point_why: Label
var _turning_point_result: Label
var _play_again_btn: Button
var _bg: ColorRect
var _vstack: VBoxContainer
var _splash_banner: Label

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	
	var bg := ColorRect.new()
	var bg_mat = ShaderMaterial.new()
	bg_mat.shader = preload("res://scenes/PhantasmalBackground.gdshader")
	bg.material = bg_mat
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	_bg = bg
	
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
	vstack.modulate.a = 0.0 # Hidden initially
	margin.add_child(vstack)
	_vstack = vstack
	
	_splash_banner = Label.new()
	_splash_banner.add_theme_font_size_override("font_size", 100)
	_splash_banner.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_splash_banner.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_splash_banner.set_anchors_preset(Control.PRESET_FULL_RECT)
	_splash_banner.modulate.a = 0.0 # Hidden initially
	add_child(_splash_banner)
	
	_status_label = Label.new()
	_status_label.text = "ENGAGEMENT TERMINATED"
	_status_label.add_theme_font_size_override("font_size", 32)
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vstack.add_child(_status_label)
	
	_result_label = Label.new()
	_result_label.add_theme_font_size_override("font_size", 48)
	_result_label.add_theme_color_override("font_color", ThemeManager.get_color("blue"))
	_result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result_label.set_meta("data_test_id", "game-over-result")
	vstack.add_child(_result_label)
	
	_outcome_label = Label.new()
	_outcome_label.add_theme_font_size_override("font_size", 20)
	_outcome_label.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
	_outcome_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vstack.add_child(_outcome_label)

	_summary_label = Label.new()
	_summary_label.add_theme_font_size_override("font_size", 18)
	_summary_label.add_theme_color_override("font_color", ThemeManager.get_color("text_dim"))
	_summary_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vstack.add_child(_summary_label)
	
	# Turning point card
	_turning_point_panel = PanelContainer.new()
	_turning_point_panel.custom_minimum_size = Vector2(400, 0)
	_turning_point_panel.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	var tp_style = StyleBoxFlat.new()
	tp_style.bg_color = Color(0.12, 0.12, 0.15)
	tp_style.border_width_bottom = 2
	tp_style.border_width_left = 2
	tp_style.border_width_right = 2
	tp_style.border_width_top = 2
	tp_style.border_color = ThemeManager.get_color("gold_dim")
	tp_style.content_margin_left = 16
	tp_style.content_margin_right = 16
	tp_style.content_margin_top = 16
	tp_style.content_margin_bottom = 16
	_turning_point_panel.add_theme_stylebox_override("panel", tp_style)
	_turning_point_panel.set_meta("data_test_id", "turning-point-summary")
	vstack.add_child(_turning_point_panel)

	var tp_stack = VBoxContainer.new()
	tp_stack.add_theme_constant_override("separation", 10)
	_turning_point_panel.add_child(tp_stack)

	var tp_title = Label.new()
	tp_title.text = "TURNING_POINT"
	tp_title.add_theme_color_override("font_color", ThemeManager.get_color("gold_dim"))
	tp_stack.add_child(tp_title)

	_turning_point_label = Label.new()
	_turning_point_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	tp_stack.add_child(_turning_point_label)

	var why_box = VBoxContainer.new()
	tp_stack.add_child(why_box)
	var why_title = Label.new()
	why_title.text = "WHY"
	why_title.add_theme_color_override("font_color", ThemeManager.get_color("text_dim"))
	why_box.add_child(why_title)
	_turning_point_why = Label.new()
	_turning_point_why.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	why_box.add_child(_turning_point_why)

	var result_box = VBoxContainer.new()
	tp_stack.add_child(result_box)
	var res_title = Label.new()
	res_title.text = "RESULT"
	res_title.add_theme_color_override("font_color", ThemeManager.get_color("text_dim"))
	result_box.add_child(res_title)
	_turning_point_result = Label.new()
	_turning_point_result.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	result_box.add_child(_turning_point_result)
	
	_play_again_btn = Button.new()
	_play_again_btn.text = "RETURN TO LOBBY"
	_play_again_btn.custom_minimum_size = Vector2(200, 50)
	_play_again_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_play_again_btn.set_meta("data_test_id", "play-again-btn")
	_play_again_btn.pressed.connect(func(): emit_signal("play_again_requested"))
	vstack.add_child(_play_again_btn)

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
	
	var victory_type = str(outcome.get("victoryType", ""))
	var victory_labels = {
		"lpDepletion": "LP Depletion",
		"cardDepletion": "Card Depletion",
		"passLimit": "Pass Limit Exceeded",
		"forfeit": "Forfeit"
	}
	var victory_display = victory_labels.get(victory_type, victory_type)
	_outcome_label.text = "%s on turn %d" % [victory_display, outcome.get("turnNumber", 0)]

	var lp_chunks: Array[String] = []
	for p in players:
		lp_chunks.append("%s: %d LP" % [str(p.get("name", "P")), int(p.get("lifepoints", 0))])
	
	_summary_label.text = " | ".join(lp_chunks)
	
	var is_bot = false
	for p in players:
		if p.get("type", "") == "bot" or p.get("isBot", false):
			is_bot = true
			
	if is_bot:
		_play_again_btn.text = "PLAY AGAIN"
	else:
		_play_again_btn.text = "RETURN TO LOBBY"
		
	var viewer_index = int(gs.get("viewerIndex", -1))
	var is_victory = (viewer_index == winner_index and viewer_index != -1)
	var is_defeat = (viewer_index != winner_index and viewer_index != -1 and winner_index != -1)
	
	var bg_mat = _bg.material as ShaderMaterial
	if is_victory:
		bg_mat.set_shader_parameter("line_color", ThemeManager.get_color("gold"))
		bg_mat.set_shader_parameter("base_color", Color(0.02, 0.02, 0.05, 1.0))
		_splash_banner.text = "VICTORY"
		_splash_banner.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
	elif is_defeat:
		bg_mat.set_shader_parameter("line_color", ThemeManager.get_color("red"))
		bg_mat.set_shader_parameter("base_color", Color(0.05, 0.01, 0.01, 1.0))
		_splash_banner.text = "DEFEAT"
		_splash_banner.add_theme_color_override("font_color", ThemeManager.get_color("red"))
	else:
		bg_mat.set_shader_parameter("line_color", Color(0.0, 0.6, 1.0, 0.3))
		_splash_banner.text = "MATCH OVER"
		_splash_banner.add_theme_color_override("font_color", ThemeManager.get_color("blue"))

	# Splash animation
	var t = create_tween()
	t.tween_property(_splash_banner, "modulate:a", 1.0, 0.8).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	t.tween_interval(1.5)
	t.tween_property(_splash_banner, "modulate:a", 0.0, 0.5)
	t.tween_property(_vstack, "modulate:a", 1.0, 0.8).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	
	var tp = _derive_turning_point(gs)
	if tp.is_empty():
		_turning_point_label.text = "No combat turn data was recorded."
		_turning_point_why.visible = false
		_turning_point_result.visible = false
		_turning_point_why.get_parent().visible = false
		_turning_point_result.get_parent().visible = false
	else:
		_turning_point_label.text = "Turn %d - %s" % [tp.get("turnNumber", 0), tp.get("label", "")]
		_turning_point_why.text = tp.get("why", "")
		_turning_point_result.text = tp.get("result", "")

func _derive_turning_point(gs: Dictionary) -> Dictionary:
	var log_entries: Array = gs.get("transactionLog", [])
	var attacks: Array = []
	for entry in log_entries:
		if entry is Dictionary and entry.get("details", {}).get("type", "") == "attack":
			attacks.append(entry)
			
	if attacks.is_empty():
		return {}
		
	# Fallback or simple extraction - take the last attack
	var last_attack = attacks.back()
	var turn_number = last_attack.get("turnNumber", 0)
	var combat = last_attack.get("details", {}).get("combat", {})
	
	return {
		"turnNumber": turn_number,
		"label": "Final Assault",
		"why": "The last recorded combat action of the match.",
		"result": "Lead to the final match outcome."
	}
