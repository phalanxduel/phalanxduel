class_name HandView
extends Node2D

var card_view_scene = preload("res://scenes/CardView.tscn")

func setup(hand: Array):
	# Clear previous cards
	for child in get_children():
		child.queue_free()
		
	for i in range(hand.size()):
		var card_view = card_view_scene.instantiate()
		add_child(card_view)
		card_view.setup(hand[i])
		card_view.position = Vector2(i * 60, 0)
		
		# Allow clicking to select
		card_view.input_pickable = true
		card_view.connect("input_event", Callable(self, "_on_card_input").bind(hand[i]))

func _on_card_input(_viewport, event, _shape_idx, card):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		print("Card selected: ", card)
		# TODO: Submit intent
