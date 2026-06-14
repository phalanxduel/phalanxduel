class_name GameViewStore
extends Node

enum ConnectionState {
	DISCONNECTED,
	CONNECTING,
	OPEN
}

var connection_state: ConnectionState = ConnectionState.DISCONNECTED:
	set(value):
		connection_state = value
		emit_signal("connection_state_changed", value)

var game_view_state: Dictionary = {}
var automation_checkpoint: String = "INITIAL":
	set(value):
		automation_checkpoint = value
		emit_signal("automation_checkpoint_changed", value)

signal connection_state_changed(new_state)
signal automation_checkpoint_changed(new_checkpoint)

func _init():
	pass
