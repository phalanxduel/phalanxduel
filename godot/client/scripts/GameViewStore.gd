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

signal connection_state_changed(new_state)

func _init():
	pass
