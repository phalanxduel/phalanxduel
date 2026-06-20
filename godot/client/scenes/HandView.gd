class_name HandView
extends Control

var card_view_scene = preload("res://scenes/CardView.tscn")

func setup(hand: Array):
	# Clear previous cards
	for child in get_children():
		child.queue_free()
	
	var hbox := HBoxContainer.new()
	hbox.add_theme_constant_override("separation", 10)
	add_child(hbox)
		
	for card in hand:
		var card_view = card_view_scene.instantiate()
		hbox.add_child(card_view)
		card_view.setup(card)
		
		# Allow clicking to select
		card_view.mouse_filter = Control.MOUSE_FILTER_STOP
		card_view.gui_input.connect(_on_card_input.bind(card))

func _on_card_input(event, card):
	var is_click = event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT
	var is_touch = event is InputEventScreenTouch and event.pressed
	var is_accept = event.is_action_pressed("ui_accept")
	
	if is_click or is_touch or is_accept:
		var card_id := str(card.get("id", ""))
		if card_id != "":
			InputDirector.get_instance().handle_selection("card", card_id)
			if event is InputEvent:
				event.get_viewport().set_input_as_handled()
