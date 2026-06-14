class_name SpectatorHud
extends Control

var store: GameViewStore

func _ready():
	store = get_node("/root/GameViewStore")
	
func _process(_delta):
	if store.game_view_state:
		update_hud(store.game_view_state)

func update_hud(state: Dictionary):
	# Display global match metadata (player stats, etc.)
	# Prioritize combat explanation events
	
	if state.has("combatExplanation"):
		# Implement rendering of combat explanations
		print("Combat explanation: ", state.combatExplanation)
