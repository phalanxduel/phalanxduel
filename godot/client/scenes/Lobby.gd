extends Control

signal match_requested(options: Dictionary)
signal browse_requested()
signal spectate_requested()
signal leaderboard_requested()

var _operative_input: LineEdit
var _opponent_btn: Button
var _damage_btn: Button
var _lp_btn: Button

var _opponents := ["bot-heuristic", "bot-random", "human"]
var _opponent_idx := 0

var _damage_modes := ["classic", "cumulative"]
var _damage_idx := 0

var _lp_modes := [20, 30, 40]
var _lp_idx := 0

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	
	var bg := ColorRect.new()
	bg.color = Color(0.05, 0.05, 0.07)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)
	
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(400, 500)
	center.add_child(panel)
	
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.07, 0.08, 0.1, 0.95)
	style.set_border_width_all(2)
	style.border_color = Color(0.08, 0.48, 1.0, 0.3)
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 4
	style.corner_radius_bottom_right = 4
	style.content_margin_left = 20
	style.content_margin_right = 20
	style.content_margin_top = 20
	style.content_margin_bottom = 20
	panel.add_theme_stylebox_override("panel", style)
	
	var vstack := VBoxContainer.new()
	vstack.add_theme_constant_override("separation", 24)
	panel.add_child(vstack)
	
	var header := Label.new()
	header.text = "PHALANX_TACTICAL_LOBBY v2.0"
	header.add_theme_color_override("font_color", Color(0.08, 0.48, 1.0))
	header.add_theme_font_size_override("font_size", 18)
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	vstack.add_child(header)
	
	# Operative ID
	var op_box := VBoxContainer.new()
	op_box.add_theme_constant_override("separation", 8)
	vstack.add_child(op_box)
	
	var op_label := Label.new()
	op_label.text = "OPERATIVE_ID"
	op_label.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
	op_label.add_theme_font_size_override("font_size", 10)
	op_box.add_child(op_label)
	
	_operative_input = LineEdit.new()
	_operative_input.placeholder_text = "GUEST_OPERATIVE"
	_operative_input.text = "GUEST_OPERATIVE"
	_operative_input.add_theme_color_override("font_color", Color.WHITE)
	_operative_input.add_theme_font_size_override("font_size", 14)
	_operative_input.set_meta("data_test_id", "lobby-name-input")
	op_box.add_child(_operative_input)
	
	# Settings Grid
	var grid := GridContainer.new()
	grid.columns = 2
	grid.add_theme_constant_override("h_separation", 16)
	grid.add_theme_constant_override("v_separation", 16)
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
	
	var start_btn := Button.new()
	start_btn.text = "READY_FOR_ENGAGEMENT"
	start_btn.custom_minimum_size = Vector2(0, 50)
	start_btn.set_meta("data_test_id", "lobby-create-btn")
	
	var start_style := StyleBoxFlat.new()
	start_style.bg_color = Color(0.08, 0.48, 1.0)
	start_style.corner_radius_top_left = 4
	start_style.corner_radius_top_right = 4
	start_style.corner_radius_bottom_left = 4
	start_style.corner_radius_bottom_right = 4
	start_btn.add_theme_stylebox_override("normal", start_style)
	start_btn.add_theme_color_override("font_color", Color.WHITE)
	start_btn.add_theme_font_size_override("font_size", 14)
	start_btn.pressed.connect(_on_start_pressed)
	vstack.add_child(start_btn)

	var browse_btn := Button.new()
	browse_btn.text = "BROWSE_ACTIVE_ENGAGEMENTS"
	browse_btn.flat = true
	browse_btn.add_theme_color_override("font_color", Color(0.4, 0.6, 1.0))
	browse_btn.pressed.connect(func(): emit_signal("browse_requested"))
	vstack.add_child(browse_btn)

	var spectate_btn := Button.new()
	spectate_btn.text = "SPECTATE_ACTIVE_MATCHES"
	spectate_btn.flat = true
	spectate_btn.add_theme_color_override("font_color", Color(0.4, 0.6, 1.0))
	spectate_btn.pressed.connect(func(): emit_signal("spectate_requested"))
	vstack.add_child(spectate_btn)

	var ladder_btn := Button.new()
	ladder_btn.text = "VIEW_LEADERBOARD"
	ladder_btn.flat = true
	ladder_btn.add_theme_color_override("font_color", Color(0.8, 0.6, 0.2))
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
	btn.add_theme_font_size_override("font_size", 12)
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
