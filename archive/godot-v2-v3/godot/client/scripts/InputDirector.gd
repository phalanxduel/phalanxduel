class_name InputDirector
extends Node

static var _instance: InputDirector

static func get_instance() -> InputDirector:
	if _instance == null:
		_instance = InputDirector.new()
	return _instance

signal selection_made(type, id)

func handle_selection(type: String, id: String):
	print("InputDirector: Selection made - type: ", type, ", id: ", id)
	selection_made.emit(type, id)
