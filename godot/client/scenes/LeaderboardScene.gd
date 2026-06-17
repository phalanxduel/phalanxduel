class_name LeaderboardScene
extends Control

signal back_requested()

const LadderRepositoryScript = preload("res://scripts/LadderRepository.gd")

var _repo: Node
var _list_container: VBoxContainer
var _category := "pvp"
var _category_btn: Button

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	
	var bg := ColorRect.new()
	bg.color = Color(0.02, 0.04, 0.08)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)
	
	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 40)
	margin.add_theme_constant_override("margin_right", 40)
	margin.add_theme_constant_override("margin_top", 40)
	margin.add_theme_constant_override("margin_bottom", 40)
	add_child(margin)
	
	var vstack := VBoxContainer.new()
	vstack.add_theme_constant_override("separation", 20)
	margin.add_child(vstack)
	
	# Header
	var header_hbox := HBoxContainer.new()
	vstack.add_child(header_hbox)
	
	var title := Label.new()
	title.text = "PHALANX_LEADERBOARD"
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", Color(0.08, 0.48, 1.0))
	header_hbox.add_child(title)
	
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_hbox.add_child(spacer)
	
	# Category Toggle
	_category_btn = Button.new()
	_category_btn.text = "CATEGORY: %s" % _category.to_upper()
	_category_btn.set_meta("data_test_id", "ladder-cat-toggle")
	_category_btn.pressed.connect(_on_category_pressed)
	header_hbox.add_child(_category_btn)
	
	var back_btn := Button.new()
	back_btn.text = "RETURN"
	back_btn.pressed.connect(func(): emit_signal("back_requested"))
	header_hbox.add_child(back_btn)
	
	# Table Header
	var table_header := HBoxContainer.new()
	table_header.add_theme_constant_override("separation", 10)
	vstack.add_child(table_header)
	
	for h in ["RANK", "GAMERTAG", "ELO", "MATCHES", "WINS"]:
		var label := Label.new()
		label.text = h
		label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
		label.add_theme_font_size_override("font_size", 12)
		label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		table_header.add_child(label)
	
	# List
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vstack.add_child(scroll)
	
	_list_container = VBoxContainer.new()
	_list_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list_container.add_theme_constant_override("separation", 5)
	scroll.add_child(_list_container)
	
	_repo = LadderRepositoryScript.new()
	add_child(_repo)
	_repo.leaderboard_loaded.connect(_on_leaderboard_loaded)
	
	_refresh()

func _refresh() -> void:
	for child in _list_container.get_children():
		child.queue_free()
	_repo.fetch_leaderboard(_category)

func _on_category_pressed() -> void:
	var cats := ["pvp", "sp-random", "sp-heuristic"]
	var idx := cats.find(_category)
	_category = cats[(idx + 1) % cats.size()]
	_category_btn.text = "CATEGORY: %s" % _category.to_upper()
	_refresh()

func _on_leaderboard_loaded(rankings: Array) -> void:
	for entry in rankings:
		var hbox := HBoxContainer.new()
		hbox.add_theme_constant_override("separation", 10)
		hbox.set_meta("data_test_id", "ladder-entry-%s" % entry.get("rank"))
		_list_container.add_child(hbox)
		
		for col in ["rank", "gamertag", "elo", "matches", "wins"]:
			var label := Label.new()
			label.text = str(entry.get(col, ""))
			label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			hbox.add_child(label)
