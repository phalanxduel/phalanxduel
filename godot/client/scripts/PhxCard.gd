class_name PhxCard
extends MarginContainer

signal clicked
signal card_dropped(card_id: String)

const ThemeManager = preload("res://scripts/ThemeManager.gd")

var _bg_rect: ColorRect
var _bg_mat: ShaderMaterial
var _card_root: MarginContainer
var _content: Control

enum Mode { HAND, SLOT }
var _mode: Mode

var card_id: String = ""
var suit: String = "?"
var face: String = "?"
var value: int = 0
var hp: int = 0
var max_hp: int = 0
var is_face_down: bool = false
var is_face_card: bool = false
var is_empty_slot: bool = false

# Interaction states
var is_selected: bool = false
var is_playable: bool = false
var is_reinforce_playable: bool = false
var is_valid_target: bool = false
var is_attackable: bool = false
var is_attacker_selected: bool = false
var is_last_action: bool = false
var is_spectator: bool = false

var _hover_tween: Tween
var _last_hand_card: Dictionary = {}
var _last_slot_card: Dictionary = {}

func _init(mode: Mode) -> void:
	_mode = mode
	
	_card_root = MarginContainer.new()
	_card_root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_card_root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	add_child(_card_root)
	
	_bg_rect = ColorRect.new()
	_bg_rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bg_mat = ShaderMaterial.new()
	_bg_mat.shader = preload("res://scenes/CardGradient.gdshader")
	_bg_rect.material = _bg_mat
	_bg_rect.resized.connect(func(): _bg_mat.set_shader_parameter("size", _bg_rect.size))
	_card_root.add_child(_bg_rect)
	
	_content = MarginContainer.new()
	_card_root.add_child(_content)

	_card_root.mouse_filter = Control.MOUSE_FILTER_STOP
	_card_root.focus_mode = Control.FOCUS_ALL
	
	_card_root.draw.connect(_on_draw)
	_card_root.focus_entered.connect(_card_root.queue_redraw)
	_card_root.focus_exited.connect(_card_root.queue_redraw)
	_card_root.gui_input.connect(_on_gui_input)
	
	_card_root.mouse_entered.connect(_on_mouse_entered)
	_card_root.mouse_exited.connect(_on_mouse_exited)

func setup_hand(card: Dictionary, selected: bool, playable: bool, reinforce: bool, spectator: bool) -> void:
	_last_hand_card = card
	card_id = str(card.get("id", ""))
	suit = str(card.get("suit", "spades"))
	face = str(card.get("face", "?"))
	value = int(card.get("value", 0))
	is_face_down = (face == "?" and suit == "?")
	is_face_card = face in ["J", "Q", "K", "A"]
	
	is_selected = selected
	is_playable = playable
	is_reinforce_playable = reinforce
	is_spectator = spectator
	
	custom_minimum_size = Vector2(102, 128)
	size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	
	_card_root.custom_minimum_size = Vector2(102, 120)
	_content.add_theme_constant_override("margin_left", 14)
	_content.add_theme_constant_override("margin_right", 14)
	_content.add_theme_constant_override("margin_top", 10)
	_content.add_theme_constant_override("margin_bottom", 10)
	
	_apply_visuals()
	_build_hand_content()

func setup_slot(slot: Variant, valid_target: bool, attackable: bool, attacker_selected: bool, last_action: bool) -> void:
	if slot is Dictionary:
		_last_slot_card = slot
	else:
		_last_slot_card = {}
	custom_minimum_size = Vector2(100, 78)
	size_flags_horizontal = Control.SIZE_EXPAND_FILL
	size_flags_vertical = Control.SIZE_SHRINK_CENTER

	_content.add_theme_constant_override("margin_left", 6)
	_content.add_theme_constant_override("margin_right", 6)
	_content.add_theme_constant_override("margin_top", 4)
	_content.add_theme_constant_override("margin_bottom", 4)
	
	is_valid_target = valid_target
	is_attackable = attackable
	is_attacker_selected = attacker_selected
	is_last_action = last_action
	
	if slot == null:
		is_empty_slot = true
		_apply_empty_slot_visuals()
		return
		
	is_empty_slot = false
	var card: Dictionary = slot.get("card", {})
	card_id = str(card.get("id", ""))
	face = str(card.get("face", "?"))
	suit = str(card.get("suit", "?"))
	hp = int(slot.get("currentHp", card.get("value", 0)))
	max_hp = int(card.get("value", hp))
	is_face_down = (face == "?" and suit == "?")
	is_face_card = face in ["J", "Q", "K", "A"]
	
	_apply_visuals()
	_build_slot_content()

func _apply_visuals() -> void:
	var accent = _suit_color(suit)
	var base_border: Color
	
	if is_face_down:
		_bg_mat.set_shader_parameter("top_color", Color(0.12, 0.12, 0.12))
		_bg_mat.set_shader_parameter("bottom_color", Color(0.05, 0.05, 0.05))
		base_border = Color(0.3, 0.3, 0.3, 0.5)
	else:
		var grad_colors = ThemeManager.get_card_gradient(suit)
		_bg_mat.set_shader_parameter("top_color", grad_colors[0])
		_bg_mat.set_shader_parameter("bottom_color", grad_colors[1])
		base_border = ThemeManager.get_color("gold") if is_face_card else Color(accent.r, accent.g, accent.b, 0.42)

	var thickness = 1.0
	
	if _mode == Mode.HAND:
		if is_selected:
			add_theme_constant_override("margin_top", 0)
			add_theme_constant_override("margin_bottom", 8)
			base_border = ThemeManager.get_color("blue")
			thickness = 2.0
		elif is_playable or is_reinforce_playable:
			add_theme_constant_override("margin_top", 8)
			add_theme_constant_override("margin_bottom", 0)
			base_border = ThemeManager.get_color("gold")
			thickness = 2.0
		else:
			add_theme_constant_override("margin_top", 8)
			add_theme_constant_override("margin_bottom", 0)
	elif _mode == Mode.SLOT:
		if is_attacker_selected:
			base_border = ThemeManager.get_color("gold")
			thickness = 2.0
		elif is_valid_target:
			base_border = ThemeManager.get_color("red")
			thickness = 2.0

	_bg_mat.set_shader_parameter("border_color", base_border)
	_bg_mat.set_shader_parameter("border_width", thickness)

func _apply_empty_slot_visuals() -> void:
	if is_valid_target:
		_bg_mat.set_shader_parameter("top_color", Color(0.12, 0.05, 0.07))
		_bg_mat.set_shader_parameter("bottom_color", Color(0.12, 0.05, 0.07))
		_bg_mat.set_shader_parameter("border_color", Color(1.0, 0.18, 0.33, 0.6))
		_bg_mat.set_shader_parameter("border_width", 1.0)
		
		var label := Label.new()
		label.text = "--"
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_color_override("font_color", Color(1.0, 0.18, 0.33))
		_content.add_child(label)
		
		var tween = _card_root.create_tween().set_loops()
		tween.tween_property(_card_root, "modulate:a", 0.5, 0.5)
		tween.tween_property(_card_root, "modulate:a", 1.0, 0.5)
	else:
		_bg_mat.set_shader_parameter("top_color", Color(0.045, 0.05, 0.065))
		_bg_mat.set_shader_parameter("bottom_color", Color(0.045, 0.05, 0.065))
		_bg_mat.set_shader_parameter("border_color", Color(0.10, 0.12, 0.15))
		_bg_mat.set_shader_parameter("border_width", 1.0)
		
		var label := Label.new()
		label.text = "--"
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		label.add_theme_color_override("font_color", Color(0.34, 0.37, 0.43))
		_content.add_child(label)

func _build_hand_content() -> void:
	var stack := VBoxContainer.new()
	stack.set_anchors_preset(Control.PRESET_FULL_RECT)
	stack.add_theme_constant_override("separation", 2)
	_content.add_child(stack)

	if is_face_down:
		var unknown_label := Label.new()
		unknown_label.text = "HIDDEN"
		unknown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		unknown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		unknown_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
		unknown_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
		stack.add_child(unknown_label)
	else:
		var accent = _suit_color(suit)
		var top := HBoxContainer.new()
		stack.add_child(top)
	
		var rank := Label.new()
		rank.text = face
		rank.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		rank.add_theme_font_size_override("font_size", 14)
		rank.add_theme_color_override("font_color", accent)
		top.add_child(rank)
	
		var suit_label := Label.new()
		suit_label.text = _suit_token(suit)
		suit_label.add_theme_font_size_override("font_size", 11)
		suit_label.add_theme_color_override("font_color", accent)
		top.add_child(suit_label)
	
		var spacer := Control.new()
		spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
		stack.add_child(spacer)
	
		var type_label := Label.new()
		type_label.text = "NUMBER"
		type_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		type_label.add_theme_font_size_override("font_size", 8)
		type_label.add_theme_color_override("font_color", Color(0.72, 0.72, 0.76))
		stack.add_child(type_label)
	
		var value_label := Label.new()
		value_label.text = "%d" % value
		value_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		value_label.add_theme_font_size_override("font_size", 11)
		value_label.add_theme_color_override("font_color", Color.WHITE)
		stack.add_child(value_label)

func _build_slot_content() -> void:
	var stack := VBoxContainer.new()
	stack.set_anchors_preset(Control.PRESET_FULL_RECT)
	stack.add_theme_constant_override("separation", 2)
	_content.add_child(stack)

	if is_face_down:
		var unknown_label := Label.new()
		unknown_label.text = "HIDDEN"
		unknown_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		unknown_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
		unknown_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
		unknown_label.size_flags_vertical = Control.SIZE_EXPAND_FILL
		stack.add_child(unknown_label)
	else:
		var accent = _suit_color(suit)
		var top := HBoxContainer.new()
		top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		stack.add_child(top)
	
		var rank := Label.new()
		rank.text = face
		rank.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		rank.add_theme_font_size_override("font_size", 14)
		rank.add_theme_color_override("font_color", accent)
		top.add_child(rank)
	
		var suit_label := Label.new()
		suit_label.text = _suit_token(suit)
		suit_label.add_theme_font_size_override("font_size", 11)
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
		hp_label.add_theme_font_size_override("font_size", 9)
		hp_label.add_theme_color_override("font_color", Color.WHITE)
		hp_panel.add_child(hp_label)

func _on_mouse_entered() -> void:
	if _hover_tween:
		_hover_tween.kill()
	_hover_tween = create_tween()
	_hover_tween.tween_method(func(val): _bg_mat.set_shader_parameter("hover_intensity", val), 0.0, 1.0, 0.2).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

	if _mode == Mode.HAND:
		if not is_selected:
			add_theme_constant_override("margin_top", 4)
			add_theme_constant_override("margin_bottom", 4)

func _on_mouse_exited() -> void:
	if _hover_tween:
		_hover_tween.kill()
	_hover_tween = create_tween()
	_hover_tween.tween_method(func(val): _bg_mat.set_shader_parameter("hover_intensity", val), 1.0, 0.0, 0.4).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)

	if _mode == Mode.HAND:
		if not is_selected:
			add_theme_constant_override("margin_top", 8)
			add_theme_constant_override("margin_bottom", 0)

func _on_draw() -> void:
	if _mode == Mode.HAND:
		if _card_root.has_focus():
			_card_root.draw_rect(Rect2(Vector2.ZERO, _card_root.size), Color(1.0, 1.0, 1.0, 0.5), false, 2.0)
	elif _mode == Mode.SLOT:
		if is_attacker_selected:
			_card_root.draw_rect(Rect2(Vector2.ZERO, _card_root.size), Color(1.0, 0.8, 0.2), false, 4.0)
		elif is_last_action:
			_card_root.draw_rect(Rect2(Vector2.ZERO, _card_root.size), Color(1.0, 1.0, 1.0, 0.15), true)
		elif _card_root.has_focus():
			_card_root.draw_rect(Rect2(Vector2.ZERO, _card_root.size), Color(1.0, 1.0, 1.0, 0.4), false, 2.0)

func _on_gui_input(event: InputEvent) -> void:
	var is_click = event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT
	var is_touch = event is InputEventScreenTouch and event.pressed
	var is_accept = event.is_action_pressed("ui_accept")
	
	if is_click or is_touch or is_accept:
		_card_root.accept_event()
		clicked.emit()

func _get_drag_data(_at_position: Vector2) -> Variant:
	if _mode != Mode.HAND or is_spectator or (not is_playable and not is_reinforce_playable):
		return null
		
	var preview = Control.new()
	var duplicate_card = load("res://scripts/PhxCard.gd").new(Mode.HAND)
	preview.add_child(duplicate_card)
	duplicate_card.setup_hand(_last_hand_card, false, false, false, false)
	duplicate_card.position = Vector2(-50, -60)
	
	set_drag_preview(preview)
	
	return {"source": "hand", "card_id": _last_hand_card.get("id", "")}

func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	if _mode != Mode.SLOT:
		return false
	if typeof(data) == TYPE_DICTIONARY and data.has("source") and data["source"] == "hand":
		return is_valid_target
	return false

func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if typeof(data) == TYPE_DICTIONARY and data.has("source") and data.has("card_id"):
		card_dropped.emit(data["card_id"])

func _suit_token(s: String) -> String:
	match s:
		"spades": return "S"
		"hearts": return "H"
		"diamonds": return "D"
		"clubs": return "C"
		_: return "?"

func _suit_color(s: String) -> Color:
	match s:
		"spades", "clubs": return Color(0.05, 0.50, 1.0)
		"hearts", "diamonds": return Color(1.0, 0.12, 0.32)
		_: return Color(0.95, 0.72, 0.25)

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
