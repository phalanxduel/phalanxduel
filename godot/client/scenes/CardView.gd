class_name CardView
extends Node2D

func setup(card_data: Dictionary):
	# card_data is based on BattlefieldCardSchema
	# Just set a placeholder color for now
	$ColorRect.color = Color.WHITE

func _ready():
	pass
