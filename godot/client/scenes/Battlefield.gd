class_name Battlefield
extends Control

const ThemeManager = preload("res://scripts/ThemeManager.gd")

signal action_requested(type, payload)

var store
var juice_manager: Node
var _root: VBoxContainer
var _player_sections: Array = []
var _combat_preview_label: Label
var _phase_label: Label
var _cancel_btn: Button
var _pass_btn: Button
var _store_bound: bool = false
var _unit_hp: Dictionary = {}

var _combat_feedback_overlay: CenterContainer
var _combat_feedback_headline: Label
var _combat_cause_container: HBoxContainer
var _last_handled_sequence: int = -1

func bind_store(game_view_store) -> void:
	store = game_view_store
	if is_node_ready():
		_attach_store()
		_refresh()

func _ready():
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_ui()
	_attach_store()
	_refresh()

func _build_ui() -> void:
	_root = VBoxContainer.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root.add_theme_constant_override("separation", 8)
	add_child(_root)

	_build_player_section(1, "HOSTILE")

	var divider := HBoxContainer.new()
	divider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	divider.add_theme_constant_override("separation", 10)
	_root.add_child(divider)

	_combat_preview_label = _pill_label("COMBAT PREVIEW: IDLE", ThemeManager.get_color("gold"))
	_combat_preview_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	divider.add_child(_combat_preview_label)

	_cancel_btn = Button.new()
	_cancel_btn.text = "CANCEL"
	_cancel_btn.flat = true
	_cancel_btn.add_theme_color_override("font_color", ThemeManager.get_color("text_dim"))
	_cancel_btn.add_theme_font_size_override("font_size", 11)
	_cancel_btn.pressed.connect(_on_cancel_pressed)
	divider.add_child(_cancel_btn)

	_pass_btn = Button.new()
	_pass_btn.text = "PASS"
	_pass_btn.flat = true
	_pass_btn.add_theme_color_override("font_color", ThemeManager.get_color("light_red"))
	_pass_btn.add_theme_font_size_override("font_size", 11)
	_pass_btn.pressed.connect(_on_pass_pressed)
	divider.add_child(_pass_btn)

	_phase_label = _pill_label("DEPLOYMENT", ThemeManager.get_color("light_blue"))
	_phase_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_phase_label.custom_minimum_size = Vector2(180, 30)
	divider.add_child(_phase_label)

	_build_player_section(0, "OPERATIVE")

	_combat_feedback_overlay = CenterContainer.new()
	_combat_feedback_overlay.set_anchors_preset(Control.PRESET_FULL_RECT)
	_combat_feedback_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_combat_feedback_overlay)

	var banner_bg := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.0, 0.0, 0.0, 0.8)
	style.border_color = ThemeManager.get_color("gold")
	style.set_border_width_all(2)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 20
	style.content_margin_right = 20
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	banner_bg.add_theme_stylebox_override("panel", style)
	banner_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_combat_feedback_overlay.add_child(banner_bg)

	var banner_vbox := VBoxContainer.new()
	banner_vbox.mouse_filter = Control.MOUSE_FILTER_IGNORE
	banner_vbox.add_theme_constant_override("separation", 4)
	banner_bg.add_child(banner_vbox)

	_combat_feedback_headline = Label.new()
	_combat_feedback_headline.add_theme_font_size_override("font_size", 24)
	_combat_feedback_headline.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	banner_vbox.add_child(_combat_feedback_headline)

	_combat_cause_container = HBoxContainer.new()
	_combat_cause_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_combat_cause_container.add_theme_constant_override("separation", 8)
	banner_vbox.add_child(_combat_cause_container)

	_combat_feedback_overlay.hide()

func _build_player_section(player_idx: int, label_text: String) -> void:
	var section := VBoxContainer.new()
	section.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	section.size_flags_vertical = Control.SIZE_EXPAND_FILL
	section.add_theme_constant_override("separation", 6)
	_root.add_child(section)

	var header := Label.new()
	header.text = label_text
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	header.add_theme_color_override("font_color", ThemeManager.get_color("gold_dim"))
	header.add_theme_font_size_override("font_size", 13)
	section.add_child(header)

	var grid := GridContainer.new()
	grid.columns = 4
	grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	grid.size_flags_vertical = Control.SIZE_EXPAND_FILL
	grid.add_theme_constant_override("h_separation", 10)
	grid.add_theme_constant_override("v_separation", 10)
	section.add_child(grid)

	_player_sections.append({
		"player_idx": player_idx,
		"label": label_text,
		"header": header,
		"grid": grid,
	})

func _attach_store() -> void:
	if store == null or _store_bound:
		return
	store.game_view_state_changed.connect(_on_store_changed)
	_store_bound = true
	
	# Register static elements now that store is available
	store.register_test_id(_combat_preview_label, "combat-preview")
	store.register_test_id(_phase_label, "phase-indicator")
	store.register_test_id(_cancel_btn, "combat-cancel-btn")
	store.register_test_id(_pass_btn, "combat-pass-btn")
	store.register_test_id(_combat_feedback_overlay, "combat-feedback-banner")

func _on_store_changed(_state) -> void:
	_refresh()

func _on_cancel_pressed() -> void:
	if store != null:
		store.selected_card_id = ""
		store.selected_slot_idx = -1

func _on_pass_pressed() -> void:
	if store != null:
		var state: Dictionary = store.game_view_state
		var valid_actions: Array = state.get("validActions", [])
		var p_idx: int = int(state.get("activePlayerIndex", 0))
		for action in valid_actions:
			if typeof(action) == TYPE_DICTIONARY and str(action.get("type", "")) == "pass":
				emit_signal("action_requested", "pass", { "playerIndex": p_idx })
				return

func _spawn_card_juice(node: Control, color: Color) -> void:
	if juice_manager != null and juice_manager.has_method("spawn_particles"):
		var center := node.global_position + node.size / 2.0
		juice_manager.call("spawn_particles", center, color)

func _refresh() -> void:
	var state: Dictionary = {}
	if store != null:
		state = store.game_view_state
	if state.is_empty():
		return

	var players: Array = state.get("players", [])
	
	# Detect damage and trigger juice
	var new_unit_hp: Dictionary = {}
	for p in players:
		var bf: Array = p.get("battlefield", [])
		for slot in bf:
			if slot is Dictionary and slot.has("card"):
				var card_id := str(slot.get("card", {}).get("id", ""))
				var card_val := int(slot.get("card", {}).get("value", 0))
				var hp := int(slot.get("currentHp", card_val))
				new_unit_hp[card_id] = hp
				
				if _unit_hp.has(card_id) and _unit_hp[card_id] > hp:
					_spawn_card_juice(self, ThemeManager.get_color("red"))
	
	_unit_hp = new_unit_hp

	var log_entries: Array = state.get("transactionLog", [])
	var latest_attack: Dictionary = {}
	for i in range(log_entries.size() - 1, -1, -1):
		var entry: Dictionary = log_entries[i]
		if entry is Dictionary and entry.has("details") and entry.get("details", {}) is Dictionary:
			if str(entry.get("details", {}).get("type", "")) == "attack":
				latest_attack = entry
				break
			
	if not latest_attack.is_empty():
		var seq := int(latest_attack.get("sequenceNumber", -1))
		if seq != _last_handled_sequence:
			_last_handled_sequence = seq
			_show_combat_feedback(latest_attack)

	var params: Dictionary = state.get("params", {})
	var rows: int = int(params.get("rows", 2))
	var columns: int = int(params.get("columns", 4))
	var phase: String = str(state.get("phase", "unknown"))
	var is_reinforce := phase == "ReinforcementPhase"
	
	if is_reinforce:
		var r_col := int(state.get("reinforcement", {}).get("column", 0)) + 1
		_phase_label.text = "REINFORCE COL %d" % r_col
	else:
		_phase_label.text = _phase_label_for(phase)
		
	_phase_label.add_theme_color_override("font_color", _phase_color(phase))

	var valid_actions: Array = state.get("validActions", [])
	var can_pass := false
	for a in valid_actions:
		if typeof(a) == TYPE_DICTIONARY and str(a.get("type", "")) == "pass":
			can_pass = true
			break
			
	if can_pass:
		_pass_btn.visible = true
		if is_reinforce:
			_pass_btn.text = "SKIP"
			_pass_btn.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
		else:
			_pass_btn.text = "PASS"
			_pass_btn.add_theme_color_override("font_color", ThemeManager.get_color("light_red"))
	else:
		_pass_btn.visible = false

	if state.has("combatPreview") and state.combatPreview is Array and not state.combatPreview.is_empty():
		_combat_preview_label.text = "PREVIEW  %s" % _format_combat_preview(state.combatPreview)
	else:
		_combat_preview_label.text = "COMBAT PREVIEW: IDLE"

	var viewer_index = state.get("viewerIndex", null)
	var is_spectator = viewer_index == null
	var my_idx: int = 0
	var opp_idx: int = 1
	if not is_spectator:
		my_idx = int(viewer_index)
		opp_idx = 1 if my_idx == 0 else 0

	_player_sections[0]["player_idx"] = opp_idx
	_player_sections[0]["label"] = "HOSTILE"
	_player_sections[1]["player_idx"] = my_idx
	_player_sections[1]["label"] = "OPERATIVE"

	for section in _player_sections:
		var player_idx: int = int(section.get("player_idx", 0))
		if player_idx >= players.size():
			continue
		var player: Dictionary = players[player_idx]
		var header: Label = section.get("header")
		var grid: GridContainer = section.get("grid")
		grid.columns = columns
		header.text = "%s    %s    LP %d    HAND %d" % [
			str(section.get("label", "")),
			str(player.get("name", "P%d" % (player_idx + 1))),
			int(player.get("lifepoints", 0)),
			int(player.get("handCount", 0)),
		]

		for child in grid.get_children():
			child.queue_free()

		var battlefield: Array = player.get("battlefield", [])
		var is_opponent: bool = (player_idx == opp_idx)
		for row in range(rows):
			for col in range(columns):
				var display_row: int = row
				var display_col: int = col
				if is_opponent:
					display_row = rows - 1 - row
					display_col = columns - 1 - col
				var slot_index: int = display_row * columns + display_col
				var slot: Variant = null
				if slot_index < battlefield.size():
					slot = battlefield[slot_index]
				grid.add_child(_build_slot_cell(slot, row, col, rows, columns, is_opponent))

func _build_slot_cell(slot: Variant, row: int, col: int, rows: int, columns: int, flipped: bool) -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(142, 68)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var is_valid = _is_cell_valid_target(row, col, flipped)

	# Click handler for card deployment/reinforcement
	panel.mouse_filter = Control.MOUSE_FILTER_STOP
	panel.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			if is_valid and store != null:
				var selected_card_id: String = store.selected_card_id
				var state: Dictionary = store.game_view_state
				var valid_actions: Array = state.get("validActions", [])
				var p_idx: int = int(state.get("activePlayerIndex", 0))
				var act_type := "deploy"
				for action in valid_actions:
					if not action is Dictionary:
						continue
					var a_type := str(action.get("type", ""))
					if a_type == "deploy" and str(action.get("cardId", "")) == selected_card_id and int(action.get("column", -1)) == col:
						act_type = "deploy"
						break
					elif a_type == "reinforce" and str(action.get("cardId", "")) == selected_card_id:
						var reinforce_col: int = int(state.get("reinforcement", {}).get("column", -1))
						if reinforce_col == col:
							act_type = "reinforce"
							break
				emit_signal("action_requested", act_type, {
					"cardId": selected_card_id,
					"column": col,
					"playerIndex": p_idx
				})
				store.selected_card_id = ""
	)

	if slot == null:
		if is_valid:
			panel.add_theme_stylebox_override("panel", _slot_style(Color(0.12, 0.05, 0.07), Color(1.0, 0.18, 0.33, 0.6)))
			var label := Label.new()
			label.text = "--"
			label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			label.add_theme_color_override("font_color", Color(1.0, 0.18, 0.33))
			panel.add_child(label)
			
			var tween = panel.create_tween().set_loops()
			tween.tween_property(panel, "modulate:a", 0.5, 0.5)
			tween.tween_property(panel, "modulate:a", 1.0, 0.5)
		else:
			panel.add_theme_stylebox_override("panel", _slot_style(Color(0.045, 0.05, 0.065), Color(0.10, 0.12, 0.15)))
			var label := Label.new()
			label.text = "--"
			label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
			label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			label.add_theme_color_override("font_color", Color(0.34, 0.37, 0.43))
			panel.add_child(label)
		return panel

	var card: Dictionary = slot.get("card", {})
	var face: String = str(card.get("face", "?"))
	var suit: String = str(card.get("suit", "?"))
	var hp: int = int(slot.get("currentHp", card.get("value", 0)))
	var max_hp: int = int(card.get("value", hp))
	var accent := _suit_color(suit)
	var is_face_down := face == "?" and suit == "?"
	
	if is_face_down:
		panel.add_theme_stylebox_override("panel", _slot_style(Color(0.12, 0.12, 0.12), Color(0.3, 0.3, 0.3, 0.6)))
	else:
		panel.add_theme_stylebox_override("panel", _slot_style(_card_bg(suit), Color(accent.r, accent.g, accent.b, 0.42)))

	var stack := VBoxContainer.new()
	stack.set_anchors_preset(Control.PRESET_FULL_RECT)
	stack.add_theme_constant_override("separation", 2)
	panel.add_child(stack)

	if is_face_down:
		var unknown_label := Label.new()
		unknown_label.text = "HIDDEN"
		unknown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		unknown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		unknown_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
		unknown_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
		stack.add_child(unknown_label)
	else:
		var top := HBoxContainer.new()
		top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		stack.add_child(top)
	
		var rank := Label.new()
		rank.text = face
		rank.add_theme_font_size_override("font_size", 30)
		rank.add_theme_color_override("font_color", accent)
		rank.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		top.add_child(rank)
	
		var suit_label := Label.new()
		suit_label.text = _suit_token(suit)
		suit_label.add_theme_font_size_override("font_size", 24)
		suit_label.add_theme_color_override("font_color", accent)
		top.add_child(suit_label)
	
		var spacer := Control.new()
		spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		stack.add_child(spacer)
	
		var hp_panel := PanelContainer.new()
		hp_panel.add_theme_stylebox_override("panel", _bar_style(accent))
		stack.add_child(hp_panel)
	
		var hp_label := Label.new()
		hp_label.text = "%d/%d" % [hp, max_hp]
		hp_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		hp_label.add_theme_font_size_override("font_size", 12)
		hp_label.add_theme_color_override("font_color", Color.WHITE)
		hp_panel.add_child(hp_label)

	if flipped:
		panel.tooltip_text = "row %d col %d mirrored" % [rows - 1 - row, columns - 1 - col]
		if store != null:
			store.register_test_id(panel, "opponent-cell-r%d-c%d" % [rows - 1 - row, columns - 1 - col])
	else:
		panel.tooltip_text = "row %d col %d" % [row, col]
		if store != null:
			store.register_test_id(panel, "player-cell-r%d-c%d" % [row, col])

	return panel

func _format_combat_preview(previews: Array) -> String:
	var chunks: Array[String] = []
	for preview in previews:
		if not preview is Dictionary:
			continue
		chunks.append("%s@%s" % [
			str(preview.get("verdict", "?")).to_upper(),
			str(int(preview.get("targetColumn", 0)) + 1),
		])
	return ", ".join(chunks)

func _suit_token(suit: String) -> String:
	match suit:
		"spades":
			return "S"
		"hearts":
			return "H"
		"diamonds":
			return "D"
		"clubs":
			return "C"
		_:
			return "?"

func _suit_color(suit: String) -> Color:
	match suit:
		"spades":
			return ThemeManager.get_color("spade")
		"hearts":
			return ThemeManager.get_color("heart")
		"diamonds":
			return ThemeManager.get_color("diamond")
		"clubs":
			return ThemeManager.get_color("club")
		_:
			return Color(0.55, 0.55, 0.55)

func _card_bg(suit: String) -> Color:
	match suit:
		"spades", "clubs":
			return Color(0.045, 0.09, 0.15)
		"hearts", "diamonds":
			return Color(0.14, 0.055, 0.08)
		_:
			return Color(0.07, 0.08, 0.10)

func _slot_style(bg: Color, border: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(1)
	style.corner_radius_top_left = 8
	style.corner_radius_top_right = 8
	style.corner_radius_bottom_left = 8
	style.corner_radius_bottom_right = 8
	style.content_margin_left = 10
	style.content_margin_right = 10
	style.content_margin_top = 8
	style.content_margin_bottom = 8
	return style

func _bar_style(accent: Color) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = Color(accent.r, accent.g, accent.b, 0.92)
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_left = 4
	style.corner_radius_bottom_right = 4
	style.content_margin_top = 1
	style.content_margin_bottom = 1
	return style

func _pill_label(text: String, color: Color) -> Label:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	return label

func _phase_label_for(phase: String) -> String:
	match phase:
		"DeploymentPhase":
			return "DEPLOYMENT"
		"AttackPhase":
			return "COMBAT"
		"gameOver":
			return "GAME OVER"
		_:
			return phase.to_upper()

func _phase_color(phase: String) -> Color:
	match phase:
		"DeploymentPhase":
			return Color(0.55, 0.82, 1.0)
		"AttackPhase":
			return Color(1.0, 0.49, 0.60)
		"gameOver":
			return Color(0.95, 0.72, 0.25)
		_:
			return Color(0.95, 0.72, 0.25)

func _is_cell_valid_target(row: int, col: int, is_opponent: bool) -> bool:
	if store == null:
		return false
	var selected_card_id: String = store.selected_card_id
	if selected_card_id == "":
		return false
	
	var state: Dictionary = store.game_view_state
	var valid_actions: Array = state.get("validActions", [])
	
	# Only our cells can be targets for deploy/reinforce
	if is_opponent:
		return false
		
	for action in valid_actions:
		if not action is Dictionary:
			continue
		var a_type: String = str(action.get("type", ""))
		if a_type == "deploy":
			if str(action.get("cardId", "")) == selected_card_id and int(action.get("column", -1)) == col:
				return true
		elif a_type == "reinforce":
			if str(action.get("cardId", "")) == selected_card_id:
				var reinforce_col: int = int(state.get("reinforcement", {}).get("column", -1))
				if reinforce_col == col:
					return true
	return false

const CAUSE_LABELS = {
	"clubDoubleOverflow": "CLUB BONUS",
	"heartDeathShield": "HEART SHIELD",
	"spadeDoubleLp": "SPADE BONUS",
	"diamondDeathShield": "DIAMOND SHIELD",
	"diamondDoubleDefense": "DIAMOND DEFENSE",
	"aceInvulnerable": "ACE SHIELD",
	"aceVsAce": "ACE PIERCES",
	"faceCardIneligible": "FACE CARD",
	"breakthrough": "BREAKTHROUGH",
	"victory": "VICTORY",
	"reinforce": "REINFORCE",
}

func _show_combat_feedback(entry: Dictionary) -> void:
	var details: Dictionary = entry.get("details", {})
	var combat: Dictionary = details.get("combat", {})
	
	var total_lp_damage := int(combat.get("totalLpDamage", 0))
	var victory_triggered := bool(details.get("victoryTriggered", false))
	var steps: Array = combat.get("steps", [])
	
	var player_damaged := total_lp_damage > 0
	var defender_front_destroyed := false
	var defender_back_destroyed := false
	var has_shield := false
	
	for step in steps:
		if not step is Dictionary: continue
		var target := str(step.get("target", ""))
		var destroyed := bool(step.get("destroyed", false))
		if target == "frontCard" and destroyed:
			defender_front_destroyed = true
		if target == "backCard" and destroyed:
			defender_back_destroyed = true
			
		var bonuses: Array = step.get("bonuses", [])
		for b in bonuses:
			var kind := str(b)
			if kind == "diamondDeathShield" or kind == "heartDeathShield":
				has_shield = true
				
	var headline := "Attack resolved"
	if victory_triggered:
		headline = "Victory"
	elif player_damaged:
		headline = "LP damage landed"
	elif has_shield:
		headline = "Shield lost"
	elif defender_front_destroyed and defender_back_destroyed:
		headline = "Column collapsed"
	elif defender_front_destroyed:
		headline = "Direct path opened"
		
	if headline != "Attack resolved":
		var cause_labels: Array = combat.get("causeLabels", [])
		_render_combat_banner(headline, cause_labels)
		
		# Juice!
		if juice_manager != null and juice_manager.has_method("shake"):
			juice_manager.shake(10.0)
			
		if juice_manager != null and juice_manager.has_method("spawn_particles"):
			juice_manager.spawn_particles(global_position + size / 2.0, ThemeManager.get_color("red"))

func _render_combat_banner(headline: String, causes: Array) -> void:
	_combat_feedback_headline.text = headline
	
	var color := ThemeManager.get_color("gold")
	if headline == "Victory": color = ThemeManager.get_color("gold_bright")
	elif headline == "LP damage landed": color = ThemeManager.get_color("red")
	elif headline == "Shield lost": color = ThemeManager.get_color("light_blue")
	elif headline == "Column collapsed" or headline == "Direct path opened": color = ThemeManager.get_color("light_red")
	
	_combat_feedback_headline.add_theme_color_override("font_color", color)
	
	for child in _combat_cause_container.get_children():
		child.queue_free()
		
	for cause in causes:
		var cstr := str(cause)
		var label := Label.new()
		label.text = CAUSE_LABELS.get(cstr, cstr.to_upper())
		var style := StyleBoxFlat.new()
		style.bg_color = Color(0.2, 0.2, 0.2, 0.8)
		style.corner_radius_top_left = 4
		style.corner_radius_top_right = 4
		style.corner_radius_bottom_left = 4
		style.corner_radius_bottom_right = 4
		style.content_margin_left = 4
		style.content_margin_right = 4
		style.content_margin_top = 2
		style.content_margin_bottom = 2
		label.add_theme_stylebox_override("normal", style)
		label.add_theme_font_size_override("font_size", 10)
		label.add_theme_color_override("font_color", ThemeManager.get_color("text"))
		_combat_cause_container.add_child(label)
		
	_combat_feedback_overlay.show()
	
	var timer := get_tree().create_timer(2.6)
	timer.timeout.connect(func():
		_combat_feedback_overlay.hide()
	)
