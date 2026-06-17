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

var test_id_map: Dictionary = {}

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
signal data_test_id_registered(node_path, test_id)

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

func register_test_id(node: Node, test_id: String) -> void:
	if node == null:
		return
	
	node.set_meta("data_test_id", test_id)
	
	if node.is_inside_tree():
		var path := str(node.get_path())
		test_id_map[test_id] = path
		emit_signal("data_test_id_registered", path, test_id)
	else:
		# If not in tree, we'll register it once it enters
		node.tree_entered.connect(func():
			var path := str(node.get_path())
			test_id_map[test_id] = path
			emit_signal("data_test_id_registered", path, test_id)
		, CONNECT_ONE_SHOT)
