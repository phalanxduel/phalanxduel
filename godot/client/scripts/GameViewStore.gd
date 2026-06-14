class_name GameViewStore
extends Node

enum ConnectionState {
	DISCONNECTED,
	CONNECTING,
	OPEN
}

var _connection_state: ConnectionState = ConnectionState.DISCONNECTED
var _game_view_state: Dictionary = {}
var _automation_checkpoint: String = "initial"

var connection_state: ConnectionState:
	get:
		return _connection_state
	set(value):
		_connection_state = value
		emit_signal("connection_state_changed", value)

var game_view_state: Dictionary:
	get:
		return _game_view_state
	set(value):
		_game_view_state = value
		emit_signal("game_view_state_changed", value)

var automation_checkpoint: String:
	get:
		return _automation_checkpoint
	set(value):
		_automation_checkpoint = value
		emit_signal("automation_checkpoint_changed", value)

var checkpoint_history: Array[Dictionary] = []

signal connection_state_changed(new_state)
signal game_view_state_changed(new_state)
signal automation_checkpoint_changed(new_checkpoint)

func _init():
	pass

func record_automation_checkpoint(checkpoint_type: String, metadata: Dictionary = {}) -> void:
	var entry := {
		"type": checkpoint_type,
		"sequence": checkpoint_history.size(),
		"metadata": metadata,
	}
	checkpoint_history.append(entry)
	automation_checkpoint = checkpoint_type
