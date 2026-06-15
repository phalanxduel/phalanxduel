class_name Battlefield
extends Control

var store
var _root: VBoxContainer
var _player_sections: Array = []
var _combat_preview_label: Label
var _store_bound: bool = false

func bind_store(game_view_store) -> void:
	store = game_view_store
	if is_node_ready():
		_attach_store()
		_refresh()

func _ready():
	set_anchors_preset(Control.PRESET_FULL_RECT)
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_ui()
	_attach_store()
	_refresh()

func _build_ui() -> void:
	_root = VBoxContainer.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root.add_theme_constant_override("separation", 10)
	add_child(_root)

	var title := Label.new()
	title.text = "Battlefield"
	title.add_theme_font_size_override("font_size", 18)
	_root.add_child(title)

	_combat_preview_label = Label.new()
	_combat_preview_label.text = "Combat preview: idle"
	_combat_preview_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_root.add_child(_combat_preview_label)

	for index in range(2):
		var section := VBoxContainer.new()
		section.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		section.add_theme_constant_override("separation", 6)
		_root.add_child(section)

		var header := Label.new()
		header.text = "P%d" % (index + 1)
		header.add_theme_font_size_override("font_size", 16)
		section.add_child(header)

		var grid := GridContainer.new()
		grid.columns = 4
		grid.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		grid.add_theme_constant_override("h_separation", 6)
		grid.add_theme_constant_override("v_separation", 6)
		section.add_child(grid)

		_player_sections.append({
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

	if state.has("combatPreview") and state.combatPreview is Array and not state.combatPreview.is_empty():
		_combat_preview_label.text = "Combat preview: %s" % _format_combat_preview(state.combatPreview)
	else:
		_combat_preview_label.text = "Combat preview: idle"

	for player_idx in range(min(players.size(), _player_sections.size())):
		var player: Dictionary = players[player_idx]
		var section: Dictionary = _player_sections[player_idx]
		var header: Label = section.get("header")
		var grid: GridContainer = section.get("grid")
		grid.columns = columns
		header.text = "%s  LP %d  hand %d" % [
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
				if player_idx == 1:
					display_row = rows - 1 - row
					display_col = columns - 1 - col
				var slot_index: int = display_row * columns + display_col
				var slot: Variant = null
				if slot_index < battlefield.size():
					slot = battlefield[slot_index]
				grid.add_child(_build_slot_cell(slot, row, col, rows, columns, player_idx == 1))

func _build_slot_cell(slot: Variant, row: int, col: int, rows: int, columns: int, flipped: bool) -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(84, 54)
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	panel.size_flags_vertical = Control.SIZE_EXPAND_FILL

	var label := Label.new()
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.autowrap_mode = TextServer.AUTOWRAP_OFF
	label.add_theme_font_size_override("font_size", 13)
	panel.add_child(label)

	if slot == null:
		label.text = "--"
		return panel

	var card: Dictionary = slot.get("card", {})
	var face: String = str(card.get("face", "?"))
	var suit: String = str(card.get("suit", "?"))
	var hp: int = int(slot.get("currentHp", card.get("value", 0)))
	label.text = "%s%s %d" % [face, _suit_token(suit), hp]
	panel.modulate = _suit_color(suit)

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
			str(preview.get("verdict", "?" )),
			str(preview.get("targetColumn", "?")),
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
