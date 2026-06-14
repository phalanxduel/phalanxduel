class_name Battlefield
extends Node2D

var store: GameViewStore
var card_view_scene = preload("res://scenes/CardView.tscn")

func _ready():
	# Assuming GameViewStore is autoloaded
	store = get_node("/root/GameViewStore")

func _process(_delta):
	if store.game_view_state:
		render_battlefield(store.game_view_state)

func render_battlefield(state: Dictionary):
	# Clear previous cards and previews
	for child in get_children():
		if child is CardView or child.has_meta("is_preview_chip"):
			child.queue_free()
	
	# Render cards
	if state.has("players"):
		for player_idx in range(state.players.size()):
			var player = state.players[player_idx]
			var battlefield = player.battlefield
			
			for item in battlefield:
				if item != null:
					var card_view = card_view_scene.instantiate()
					add_child(card_view)
					card_view.setup(item)
					
					# Position the card
					var row = item.position.row
					var col = item.position.col
					
					# Adjust based on player orientation
					if player_idx == 1: # Opponent
						row = 11 - row
						col = 11 - col
						
					card_view.position = Vector2(col * 60, row * 80)

	# Render combat previews
	if state.has("combatPreview") and state.combatPreview != null:
		for preview in state.combatPreview:
			var chip = Label.new()
			chip.text = preview.verdict
			chip.add_theme_font_size_override("font_size", 30)
			add_child(chip)
			chip.set_meta("is_preview_chip", true)
			# Position the chip over the target column
			chip.position = Vector2(preview.targetColumn * 60, 50)
