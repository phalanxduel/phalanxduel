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
	# Clear previous cards
	for child in get_children():
		if child is CardView:
			child.queue_free()
	
	# Assume player 0 is the current player, and their battlefield is rows 0-5
	# Player 1 is opponent, battlefield rows 6-11
	# The BattlefieldSchema is an array of size 144 (12x12) or something?
	# Wait, BattlefieldSchema is an array. Let's look at it again.
	# "BattlefieldSchema = z.array(z.union([BattlefieldCardSchema, z.null()]))"
	
	if not state.has("players"):
		return
		
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
				# In a real game, this would depend on the viewerIndex
				if player_idx == 1: # Opponent
					row = 11 - row
					col = 11 - col
					
				card_view.position = Vector2(col * 60, row * 80)
