class_name CardView
extends Control

const ThemeManager = preload("res://scripts/ThemeManager.gd")

var _bg: ColorRect
var _suit_label: Label
var _face_label: Label
var is_selected: bool = false

func _ready() -> void:
	_ensure_ui()

func setup(card_data: Dictionary) -> void:
	_ensure_ui()
	var suit := str(card_data.get("suit", "spades"))
	var face := str(card_data.get("face", "?"))

	_bg.color = ThemeManager.get_color("bg")

	_suit_label.text = _suit_to_glyph(suit)
	_suit_label.add_theme_color_override("font_color", _suit_color(suit))

	_face_label.text = face
	_face_label.add_theme_color_override("font_color", ThemeManager.get_color("text"))
	_face_label.add_theme_font_size_override("font_size", 20)

func set_selected(val: bool) -> void:
	is_selected = val
	queue_redraw()
	if is_selected:
		position.y = -8
	else:
		position.y = 0

func _draw() -> void:
	if is_selected:
		draw_rect(Rect2(Vector2.ZERO, size), Color(0.0, 0.48, 1.0, 1.0), false, 2.0)

func _ensure_ui() -> void:
	if _bg != null:
		return

	custom_minimum_size = Vector2(50, 70)
	_bg = get_node_or_null("ColorRect") as ColorRect
	if _bg == null:
		_bg = ColorRect.new()
		_bg.name = "ColorRect"
		add_child(_bg)
		move_child(_bg, 0)
	_bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	_bg.mouse_filter = Control.MOUSE_FILTER_IGNORE

	var margin := MarginContainer.new()
	margin.name = "Content"
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 5)
	margin.add_theme_constant_override("margin_top", 5)
	margin.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(margin)

	var vstack := VBoxContainer.new()
	vstack.add_theme_constant_override("separation", 5)
	vstack.mouse_filter = Control.MOUSE_FILTER_IGNORE
	margin.add_child(vstack)

	_suit_label = Label.new()
	_suit_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vstack.add_child(_suit_label)

	_face_label = Label.new()
	_face_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	vstack.add_child(_face_label)

func _suit_to_glyph(suit: String) -> String:
	match suit:
		"spades": return "♠"
		"hearts": return "♥"
		"diamonds": return "♦"
		"clubs": return "♣"
		_: return "?"

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
			return ThemeManager.get_color("text")
