class_name MatchBrowser
extends Control

signal match_selected(match_id)
signal back_requested()

const MatchRepositoryScript = preload("res://scripts/MatchRepository.gd")

var _repo: Node
var _list_container: VBoxContainer
var _status_label: Label

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
	title.text = "ACTIVE_ENGAGEMENTS"
	title.add_theme_font_size_override("font_size", 24)
	title.add_theme_color_override("font_color", Color(0.08, 0.48, 1.0))
	header_hbox.add_child(title)
	
	var spacer := Control.new()
	spacer.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header_hbox.add_child(spacer)
	
	var refresh_btn := Button.new()
	refresh_btn.text = "REFRESH"
	refresh_btn.set_meta("data_test_id", "browser-refresh-btn")
	refresh_btn.pressed.connect(_on_refresh_pressed)
	header_hbox.add_child(refresh_btn)
	
	var back_btn := Button.new()
	back_btn.text = "BACK"
	back_btn.set_meta("data_test_id", "browser-back-btn")
	back_btn.pressed.connect(func(): emit_signal("back_requested"))
	header_hbox.add_child(back_btn)
	
	# Status
	_status_label = Label.new()
	_status_label.text = "SCANNING_ENCRYPTED_CHANNELS..."
	_status_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
	vstack.add_child(_status_label)
	
	# List
	var scroll := ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vstack.add_child(scroll)
	
	_list_container = VBoxContainer.new()
	_list_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_list_container.add_theme_constant_override("separation", 10)
	scroll.add_child(_list_container)
	
	_repo = MatchRepositoryScript.new()
	add_child(_repo)
	_repo.lobby_matches_loaded.connect(_on_matches_loaded)
	_repo.request_failed.connect(_on_request_failed)
	
	_on_refresh_pressed()

func _on_refresh_pressed() -> void:
	_status_label.text = "SCANNING_ENCRYPTED_CHANNELS..."
	for child in _list_container.get_children():
		child.queue_free()
	_repo.fetch_lobby_matches()

func _on_matches_loaded(matches: Array) -> void:
	_status_label.text = "FOUND %d ACTIVE_SIGNALS" % matches.size()
	
	for match_data in matches:
		var item := _build_match_item(match_data)
		_list_container.add_child(item)

func _on_request_failed(error: String) -> void:
	_status_label.text = "SCAN_FAILED: %s" % error

func _build_match_item(data: Dictionary) -> PanelContainer:
	var panel := PanelContainer.new()
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.05, 0.1, 0.15)
	style.border_width_left = 4
	style.border_color = Color(0.08, 0.48, 1.0)
	style.content_margin_all = 12
	panel.add_theme_stylebox_override("panel", style)
	
	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 20)
	panel.add_child(hbox)
	
	var v_info := VBoxContainer.new()
	v_info.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hbox.add_child(v_info)
	
	var creator := Label.new()
	creator.text = str(data.get("creatorName", "UNKNOWN_OPERATIVE"))
	creator.add_theme_font_size_override("font_size", 16)
	v_info.add_child(creator)
	
	var details := Label.new()
	var match_id: String = str(data.get("matchId", ""))
	var age: int = int(data.get("ageSeconds", 0))
	details.text = "ID: %s | AGE: %ds" % [match_id.substr(0, 8), age]
	details.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
	details.add_theme_font_size_override("font_size", 12)
	v_info.add_child(details)
	
	var join_btn := Button.new()
	join_btn.text = "INTERCEPT"
	join_btn.custom_minimum_size = Vector2(120, 0)
	join_btn.set_meta("data_test_id", "browser-intercept-%s" % match_id)
	join_btn.pressed.connect(func(): emit_signal("match_selected", match_id))
	hbox.add_child(join_btn)
	
	return panel
