extends Control

const ThemeManager = preload("res://scripts/ThemeManager.gd")

signal match_requested(options: Dictionary)
signal browse_requested()
signal spectate_requested()
signal leaderboard_requested()

var _operative_input: LineEdit
var _opponent_btn: Button
var _damage_btn: Button
var _lp_btn: Button
var _status_label: Label
var _start_btn: Button

var _opponents := ["bot-heuristic", "bot-random", "human"]
var _opponent_idx := 0

var _damage_modes := ["classic", "cumulative"]
var _damage_idx := 0

var _lp_modes := [20, 30, 40]
var _lp_idx := 0

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	
	var bg := ColorRect.new()
	bg.color = ThemeManager.get_color("bg")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(450, 550)
	center.add_child(panel)
	
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.02, 0.02, 0.05, 0.95)
	style.set_border_width_all(2)
	style.border_color = ThemeManager.get_color("blue")
	style.border_color.a = 0.5
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 32
	style.content_margin_right = 32
	style.content_margin_top = 32
	style.content_margin_bottom = 32
	style.shadow_color = ThemeManager.get_color("blue")
	style.shadow_color.a = 0.2
	style.shadow_size = 20
	panel.add_theme_stylebox_override("panel", style)
	
	var vstack := VBoxContainer.new()
	vstack.add_theme_constant_override("separation", 24)
	panel.add_child(vstack)
	
	var header := Label.new()
	header.text = "PHALANX_TACTICAL_LOBBY v2.0"
	header.add_theme_color_override("font_color", ThemeManager.get_color("blue"))
	header.add_theme_font_size_override("font_size", 22)
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vstack.add_child(header)
	
	# Operative ID
	var op_box := VBoxContainer.new()
	op_box.add_theme_constant_override("separation", 8)
	vstack.add_child(op_box)
	
	var op_label := Label.new()
	op_label.text = "OPERATIVE_ID"
	op_label.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
	op_label.add_theme_font_size_override("font_size", 12)
	op_box.add_child(op_label)
	
	_operative_input = LineEdit.new()
	_operative_input.placeholder_text = "GUEST_OPERATIVE"
	_operative_input.text = "GUEST_OPERATIVE"
	_operative_input.add_theme_color_override("font_color", Color.WHITE)
	_operative_input.add_theme_font_size_override("font_size", 16)
	_operative_input.set_meta("data_test_id", "lobby-name-input")
	
	var line_edit_style = StyleBoxFlat.new()
	line_edit_style.bg_color = ThemeManager.get_color("bg")
	line_edit_style.set_border_width_all(1)
	line_edit_style.border_color = ThemeManager.get_color("text_dim")
	line_edit_style.content_margin_left = 12
	line_edit_style.content_margin_top = 8
	line_edit_style.content_margin_bottom = 8
	_operative_input.add_theme_stylebox_override("normal", line_edit_style)
	_operative_input.add_theme_stylebox_override("focus", line_edit_style)
	
	op_box.add_child(_operative_input)
	
	# Settings Grid
	var grid := GridContainer.new()
	grid.columns = 2
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 24)
	grid.add_theme_constant_override("v_separation", 24)
	vstack.add_child(grid)
	
	# Opponent
	var opp_box := _build_field("OPPONENT")
	_opponent_btn = _build_toggle(_opponents[_opponent_idx].to_upper().replace("-", "_"))
	_opponent_btn.pressed.connect(_on_opponent_pressed)
	_opponent_btn.set_meta("data_test_id", "lobby-opponent-toggle")
	opp_box.add_child(_opponent_btn)
	grid.add_child(opp_box)
	
	# Damage Mode
	var dmg_box := _build_field("DAMAGE_MODE")
	_damage_btn = _build_toggle(_damage_modes[_damage_idx].to_upper())
	_damage_btn.pressed.connect(_on_damage_pressed)
	_damage_btn.set_meta("data_test_id", "lobby-damage-toggle")
	dmg_box.add_child(_damage_btn)
	grid.add_child(dmg_box)
	
	# LP
	var lp_box := _build_field("STARTING_LP")
	_lp_btn = _build_toggle(str(_lp_modes[_lp_idx]))
	_lp_btn.pressed.connect(_on_lp_pressed)
	_lp_btn.set_meta("data_test_id", "lobby-lp-toggle")
	lp_box.add_child(_lp_btn)
	grid.add_child(lp_box)
	
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vstack.add_child(spacer)
	
	_status_label = Label.new()
	_status_label.text = "AWAITING DEPLOYMENT PARAMETERS"
	_status_label.add_theme_color_override("font_color", ThemeManager.get_color("text_dim"))
	_status_label.add_theme_font_size_override("font_size", 12)
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vstack.add_child(_status_label)
	
	_start_btn = Button.new()
	_start_btn.text = "READY_FOR_ENGAGEMENT"
	_start_btn.custom_minimum_size = Vector2(0, 50)
	_start_btn.set_meta("data_test_id", "lobby-create-btn")
	
	var start_style := StyleBoxFlat.new()
	start_style.bg_color = ThemeManager.get_color("blue")
	start_style.corner_radius_top_left = 4
	start_style.corner_radius_top_right = 4
	start_style.corner_radius_bottom_left = 4
	start_style.corner_radius_bottom_right = 4
	_start_btn.add_theme_stylebox_override("normal", start_style)
	
	var start_hover := start_style.duplicate()
	start_hover.bg_color = ThemeManager.get_color("blue").lightened(0.2)
	start_hover.shadow_color = ThemeManager.get_color("blue")
	start_hover.shadow_size = 10
	_start_btn.add_theme_stylebox_override("hover", start_hover)
	
	var start_disabled := start_style.duplicate()
	start_disabled.bg_color = ThemeManager.get_color("bg").lightened(0.1)
	start_disabled.border_color = ThemeManager.get_color("text_dim")
	_start_btn.add_theme_stylebox_override("disabled", start_disabled)
	
	_start_btn.add_theme_color_override("font_color", Color.WHITE)
	_start_btn.add_theme_font_size_override("font_size", 16)
	_start_btn.pressed.connect(_on_start_pressed)
	vstack.add_child(_start_btn)

	var browse_btn := Button.new()
	browse_btn.text = "BROWSE_ACTIVE_ENGAGEMENTS"
	browse_btn.flat = true
	browse_btn.add_theme_color_override("font_color", ThemeManager.get_color("blue"))
	browse_btn.pressed.connect(func(): emit_signal("browse_requested"))
	vstack.add_child(browse_btn)

	var spectate_btn := Button.new()
	spectate_btn.text = "SPECTATE_ACTIVE_MATCHES"
	spectate_btn.flat = true
	spectate_btn.add_theme_color_override("font_color", ThemeManager.get_color("blue"))
	spectate_btn.pressed.connect(func(): emit_signal("spectate_requested"))
	vstack.add_child(spectate_btn)

	var ladder_btn := Button.new()
	ladder_btn.text = "VIEW_LEADERBOARD"
	ladder_btn.flat = true
	ladder_btn.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
	ladder_btn.pressed.connect(func(): emit_signal("leaderboard_requested"))
	vstack.add_child(ladder_btn)

func _build_field(label_text: String) -> VBoxContainer:
	var box := VBoxContainer.new()
	box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	box.add_theme_constant_override("separation", 4)
	
	var label := Label.new()
	label.text = label_text
	label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
	label.add_theme_font_size_override("font_size", 10)
	box.add_child(label)
	return box

func _build_toggle(text: String) -> Button:
	var btn := Button.new()
	btn.text = text
	btn.add_theme_font_size_override("font_size", 14)
	
	var style_normal := StyleBoxFlat.new()
	style_normal.bg_color = ThemeManager.get_color("bg")
	style_normal.set_border_width_all(1)
	style_normal.border_color = ThemeManager.get_color("text_dim")
	style_normal.content_margin_top = 8
	style_normal.content_margin_bottom = 8
	btn.add_theme_stylebox_override("normal", style_normal)
	
	var style_hover := style_normal.duplicate()
	style_hover.border_color = ThemeManager.get_color("gold")
	btn.add_theme_stylebox_override("hover", style_hover)
	
	btn.add_theme_color_override("font_color", ThemeManager.get_color("text"))
	btn.add_theme_color_override("font_hover_color", ThemeManager.get_color("gold"))
	
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	return btn

func _on_opponent_pressed() -> void:
	_opponent_idx = (_opponent_idx + 1) % _opponents.size()
	_opponent_btn.text = _opponents[_opponent_idx].to_upper().replace("-", "_")

func _on_damage_pressed() -> void:
	_damage_idx = (_damage_idx + 1) % _damage_modes.size()
	_damage_btn.text = _damage_modes[_damage_idx].to_upper()

func _on_lp_pressed() -> void:
	_lp_idx = (_lp_idx + 1) % _lp_modes.size()
	_lp_btn.text = str(_lp_modes[_lp_idx])

func _on_start_pressed() -> void:
	_status_label.text = "ESTABLISHING UPLINK..."
	_status_label.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
	_start_btn.disabled = true
	
	var name_text := _operative_input.text.strip_edges()
	if name_text == "":
		name_text = "GUEST_OPERATIVE"
	
	var opponent = _opponents[_opponent_idx]
	if opponent == "human":
		opponent = null
	
	var options := {
		"mode": "create",
		"playerName": name_text,
		"visibility": "private",
		"opponent": opponent,
		"botDifficulty": "medium",
		"gameOptions": {
			"damageMode": _damage_modes[_damage_idx],
			"startingLifepoints": _lp_modes[_lp_idx],
			"classicDeployment": true
		},
		"matchParams": {
			"rows": 2,
			"columns": 4,
			"maxHandSize": 4,
			"initialDraw": 12,
			"modeDamagePersistence": _damage_modes[_damage_idx]
		}
	}
	
	emit_signal("match_requested", options)
