class_name Battlefield
extends Control

var store
var _root: VBoxContainer
var _player_sections: Array = []
var _combat_preview_label: Label
var _phase_label: Label
var _store_bound: bool = false

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

	_combat_preview_label = _pill_label("COMBAT PREVIEW: IDLE", Color(0.95, 0.72, 0.25))
	_combat_preview_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	divider.add_child(_combat_preview_label)

	_phase_label = _pill_label("DEPLOYMENT", Color(0.55, 0.82, 1.0))
	_phase_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_phase_label.custom_minimum_size = Vector2(180, 30)
	divider.add_child(_phase_label)

	_build_player_section(0, "OPERATIVE")

func _build_player_section(player_idx: int, label_text: String) -> void:
	var section := VBoxContainer.new()
	section.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	section.size_flags_vertical = Control.SIZE_EXPAND_FILL
	section.add_theme_constant_override("separation", 6)
	_root.add_child(section)

	var header := Label.new()
	header.text = label_text
	header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	header.add_theme_color_override("font_color", Color(0.69, 0.53, 0.12))
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

func _on_store_changed(_state) -> void:
	_refresh()

func _refresh() -> void:
	var state: Dictionary = {}
	if store != null:
		state = store.game_view_state
	if state.is_empty():
		return

	var players: Array = state.get("players", [])
	var params: Dictionary = state.get("params", {})
	var rows: int = int(params.get("rows", 2))
	var columns: int = int(params.get("columns", 4))
	var phase: String = str(state.get("phase", "unknown"))
	_phase_label.text = _phase_label_for(phase)
	_phase_label.add_theme_color_override("font_color", _phase_color(phase))

	if state.has("combatPreview") and state.combatPreview is Array and not state.combatPreview.is_empty():
		_combat_preview_label.text = "PREVIEW  %s" % _format_combat_preview(state.combatPreview)
	else:
		_combat_preview_label.text = "COMBAT PREVIEW: IDLE"

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
		for row in range(rows):
			for col in range(columns):
				var display_row: int = row
				var display_col: int = col
				if int(section.get("player_idx", 0)) == 1:
					display_row = rows - 1 - row
					display_col = columns - 1 - col
				var slot_index: int = display_row * columns + display_col
				var slot: Variant = null
				if slot_index < battlefield.size():
					slot = battlefield[slot_index]
				grid.add_child(_build_slot_cell(slot, row, col, rows, columns, player_idx == 1))

func _build_slot_cell(slot: Variant, row: int, col: int, rows: int, columns: int, flipped: bool) -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(142, 68)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	if slot == null:
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
	panel.add_theme_stylebox_override("panel", _slot_style(_card_bg(suit), Color(accent.r, accent.g, accent.b, 0.42)))

	var stack := VBoxContainer.new()
	stack.set_anchors_preset(Control.PRESET_FULL_RECT)
	stack.add_theme_constant_override("separation", 2)
	panel.add_child(stack)

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
	else:
		panel.tooltip_text = "row %d col %d" % [row, col]

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
			return Color(0.38, 0.47, 0.64)
		"hearts":
			return Color(0.68, 0.38, 0.42)
		"diamonds":
			return Color(0.72, 0.58, 0.28)
		"clubs":
			return Color(0.34, 0.55, 0.42)
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
