class_name ConnectionClient
extends Node

const GameViewStoreScript = preload("res://scripts/GameViewStore.gd")
const ProtocolCodecScript = preload("res://scripts/ProtocolCodec.gd")
const ProtocolValidatorScript = preload("res://scripts/ProtocolValidator.gd")

var socket = WebSocketPeer.new()
var store
var replay_controller
var watch_match_id: String = ""
var _watch_message_sent: bool = false
var _last_view_state: Dictionary = {}

signal match_created(match_id, player_id)

func _init(game_view_store, controller):
	store = game_view_store
	replay_controller = controller

func watch_match(match_id: String) -> void:
	watch_match_id = match_id
	_watch_message_sent = false

func create_match(params: Dictionary) -> void:
	send_message({
		"type": "createMatch",
		"playerName": params.get("playerName", "GUEST_OPERATIVE"),
		"visibility": params.get("visibility", "private"),
		"gameOptions": params.get("gameOptions", {}),
		"matchParams": params.get("matchParams", {}),
		"opponent": params.get("opponent", null),
		"botDifficulty": params.get("botDifficulty", null),
	})

func connect_to_server(url: String):
	store.connection_state = GameViewStoreScript.ConnectionState.CONNECTING
	var err = socket.connect_to_url(url)
	if err != OK:
		print("Unable to connect to server: ", err)
		store.connection_state = GameViewStoreScript.ConnectionState.DISCONNECTED

func _process(_delta):
	socket.poll()
	var state = socket.get_ready_state()
	
	if state == WebSocketPeer.STATE_OPEN:
		if store.connection_state != GameViewStoreScript.ConnectionState.OPEN:
			store.connection_state = GameViewStoreScript.ConnectionState.OPEN
		if watch_match_id != "" and not _watch_message_sent:
			send_message({
				"type": "watchMatch",
				"matchId": watch_match_id,
			})
			_watch_message_sent = true
			store.record_automation_checkpoint("watch_requested", {
				"matchId": watch_match_id,
			})
		
		while socket.get_available_packet_count():
			var packet = socket.get_packet()
			var data = ProtocolCodecScript.decode(packet.get_string_from_utf8())
			if data and data is Dictionary:
				_handle_message(data)
	elif state == WebSocketPeer.STATE_CLOSED:
		if store.connection_state != GameViewStoreScript.ConnectionState.DISCONNECTED:
			store.connection_state = GameViewStoreScript.ConnectionState.DISCONNECTED

func send_message(data: Dictionary):
	if data.has("type") and data.type == "submitAction":
		if not ProtocolValidatorScript.validate_intent(data.action):
			push_error("Protocol Violation: Invalid intent structure")
			return
			
	var json_string = ProtocolCodecScript.encode(data)
	socket.send_text(json_string)

func _handle_message(data: Dictionary) -> void:
	var message_type: String = str(data.get("type", ""))
	if message_type == "gameViewModel":
		_push_view_state(_normalize_game_state_message(data))
	elif message_type == "gameState":
		_push_view_state(_normalize_turn_state_message(data))
	elif message_type == "spectatorJoined":
		store.record_automation_checkpoint("spectator_joined", {
			"matchId": str(data.get("matchId", "")),
		})

func _push_view_state(view_state: Dictionary) -> void:
	if view_state.is_empty():
		return

	var next_state: Dictionary = view_state.duplicate(true)
	if _last_view_state.is_empty():
		replay_controller.load_frames([next_state])
	else:
		replay_controller.load_frames([_last_view_state.duplicate(true), next_state])
		replay_controller.play()
	_last_view_state = next_state

func _normalize_game_state_message(data: Dictionary) -> Dictionary:
	var view_model: Dictionary = data.get("viewModel", {})
	var game_state: Dictionary = view_model.get("state", {})
	return _normalize_game_state(
		game_state,
		view_model.get("validActions", []),
		view_model.get("viewerIndex", null),
		data,
	)

func _normalize_turn_state_message(data: Dictionary) -> Dictionary:
	var result: Dictionary = data.get("result", {})
	var game_state: Dictionary = result.get("postState", {})
	var view_model: Dictionary = data.get("viewModel", {})
	return _normalize_game_state(
		game_state,
		view_model.get("validActions", []),
		view_model.get("viewerIndex", null),
		data,
	)

func _normalize_game_state(
	game_state: Dictionary,
	valid_actions: Array,
	viewer_index: Variant,
	transport: Dictionary,
) -> Dictionary:
	if game_state.is_empty():
		return {}

	var players: Array = []
	for player_state in game_state.get("players", []):
		if not player_state is Dictionary:
			continue
		var player: Dictionary = player_state.get("player", {})
		players.append({
			"id": str(player.get("id", "")),
			"name": str(player.get("name", "")),
			"lifepoints": int(player_state.get("lifepoints", 0)),
			"handCount": int(player_state.get("handCount", player_state.get("hand", []).size())),
			"battlefield": player_state.get("battlefield", []),
		})

	var normalized: Dictionary = {
		"matchId": str(game_state.get("matchId", transport.get("matchId", ""))),
		"phase": str(game_state.get("phase", "")),
		"turnNumber": int(game_state.get("turnNumber", 0)),
		"activePlayerIndex": int(game_state.get("activePlayerIndex", 0)),
		"viewerIndex": game_state.get("viewerIndex", viewer_index),
		"players": players,
		"validActions": valid_actions,
		"params": game_state.get("params", {}),
		"spectatorCount": int(transport.get("spectatorCount", 0)),
		"source": str(transport.get("type", "")),
	}

	if game_state.has("outcome") and game_state.outcome != null:
		normalized.outcome = game_state.outcome
	if game_state.has("combatPreview"):
		normalized.combatPreview = game_state.combatPreview
	if game_state.has("reinforcement"):
		normalized.reinforcement = game_state.reinforcement

	return normalized
