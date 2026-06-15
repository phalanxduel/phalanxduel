extends Control
class_name MatchRoot

const GameViewStoreScript = preload("res://scripts/GameViewStore.gd")
const ReplayControllerScript = preload("res://scripts/ReplayController.gd")
const ConnectionClientScript = preload("res://scripts/ConnectionClient.gd")
const SpectatorHudScript = preload("res://scenes/SpectatorHud.gd")
const BattlefieldScene = preload("res://scenes/Battlefield.tscn")

const DEMO_MATCH_ID := "11111111-1111-1111-1111-111111111111"
const DEMO_PLAYER_IDS := [
	"22222222-2222-2222-2222-222222222222",
	"33333333-3333-3333-3333-333333333333",
]

var _launch_options: Dictionary = {}
var _launch_mode: String = "demo"
var _store
var _replay_controller
var _connection_client
var _battlefield
var _spectator_hud
var _status_label: Label
var _mode_label: Label
var _timeline_label: Label
var _did_hydrate: bool = false
var _did_idle: bool = false
var _demo_frames: Array = []

func configure(launch_options: Dictionary) -> void:
	_launch_options = launch_options.duplicate(true)
	if is_node_ready():
		_apply_launch_options()

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	_build_runtime()
	_apply_launch_options()

func _build_ui() -> void:
	var root := ColorRect.new()
	root.color = Color(0.08, 0.09, 0.11)
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	var outer := MarginContainer.new()
	outer.set_anchors_preset(Control.PRESET_FULL_RECT)
	outer.add_theme_constant_override("margin_left", 18)
	outer.add_theme_constant_override("margin_top", 16)
	outer.add_theme_constant_override("margin_right", 18)
	outer.add_theme_constant_override("margin_bottom", 16)
	add_child(outer)

	var stack := VBoxContainer.new()
	stack.set_anchors_preset(Control.PRESET_FULL_RECT)
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stack.add_theme_constant_override("separation", 12)
	outer.add_child(stack)

	_mode_label = Label.new()
	_mode_label.text = "Mode: demo"
	_mode_label.add_theme_font_size_override("font_size", 18)
	stack.add_child(_mode_label)

	_status_label = Label.new()
	_status_label.text = "Match: waiting"
	_status_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_status_label)

	_timeline_label = Label.new()
	_timeline_label.text = "Timeline: idle"
	_timeline_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(_timeline_label)

	var body := HBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 14)
	stack.add_child(body)

	_battlefield = BattlefieldScene.instantiate()
	_battlefield.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_battlefield.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_child(_battlefield)

	_spectator_hud = SpectatorHudScript.new()
	_spectator_hud.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_spectator_hud.custom_minimum_size = Vector2(320, 0)
	body.add_child(_spectator_hud)

func _build_runtime() -> void:
	_store = GameViewStoreScript.new()
	add_child(_store)

	_replay_controller = ReplayControllerScript.new()
	add_child(_replay_controller)
	_replay_controller.frame_changed.connect(_on_frame_changed)
	_replay_controller.playback_finished.connect(_on_playback_finished)

	_battlefield.bind_store(_store)
	_spectator_hud.bind_store(_store)

	_connection_client = ConnectionClientScript.new(_store, _replay_controller)
	add_child(_connection_client)

	_store.connection_state_changed.connect(_on_store_changed)
	_store.game_view_state_changed.connect(_on_store_changed)
	_store.automation_checkpoint_changed.connect(_on_store_changed)

	_store.record_automation_checkpoint("connected", {
		"mode": str(_launch_options.get("mode", "demo")),
	})

func _apply_launch_options() -> void:
	_launch_mode = str(_launch_options.get("mode", "demo"))
	_mode_label.text = "Mode: %s" % _launch_mode

	if _launch_mode == "live":
		var watch_url: String = str(_launch_options.get("watch_url", ""))
		var match_id: String = str(_launch_options.get("match_id", ""))
		if watch_url == "" or match_id == "":
			_launch_mode = "demo"
			_status_label.text = "Live mode requires --watch-url and --match-id"
			_timeline_label.text = "Timeline: falling back to demo replay"
			_start_demo()
			return

		_status_label.text = "Watch: %s" % _shorten_watch_url(watch_url)
		_timeline_label.text = "Timeline: waiting for live match %s" % _shorten_id(match_id)
		_connection_client.watch_match(match_id)
		_connection_client.connect_to_server(watch_url)
		return

	_status_label.text = "Match: deterministic demo replay"
	_timeline_label.text = "Timeline: scripted playback"
	_start_demo()

func _start_demo() -> void:
	_did_hydrate = false
	_did_idle = false
	_demo_frames = _build_demo_frames()
	_replay_controller.set_speed(float(_launch_options.get("replay_speed", 1.5)))
	_replay_controller.load_frames(_demo_frames)
	_replay_controller.play()

func _on_frame_changed(frame: Variant) -> void:
	if not frame is Dictionary:
		return

	var snapshot: Dictionary = frame.duplicate(true)
	_store.game_view_state = snapshot

	var phase: String = str(snapshot.get("phase", "unknown"))
	var turn_number: int = int(snapshot.get("turnNumber", 0))
	var active_player_index: int = int(snapshot.get("activePlayerIndex", 0))
	var viewer_index: Variant = snapshot.get("viewerIndex", null)
	var spectator_count: int = int(snapshot.get("spectatorCount", 0))

	_status_label.text = "Match: %s | phase: %s | turn: %d | active: P%d" % [
		_shorten_id(str(snapshot.get("matchId", ""))),
		phase,
		turn_number,
		active_player_index + 1,
	]

	if not _did_hydrate:
		_store.record_automation_checkpoint("hydrated", {
			"matchId": str(snapshot.get("matchId", "")),
			"phase": phase,
			"turnNumber": turn_number,
		})
		_did_hydrate = true
	else:
		_store.record_automation_checkpoint("replay_frame", {
			"phase": phase,
			"turnNumber": turn_number,
		})

	if phase == "gameOver" and not _did_idle:
		_store.record_automation_checkpoint("animation_idle", {
			"matchId": str(snapshot.get("matchId", "")),
			"turnNumber": turn_number,
		})
		_did_idle = true

	_timeline_label.text = "Viewer: %s | spectators: %d | checkpoints: %s" % [
		_shorten_viewer(viewer_index),
		spectator_count,
		_store.automation_checkpoint,
	]

func _on_playback_finished() -> void:
	if not _did_idle:
		var state: Dictionary = _store.game_view_state
		_store.record_automation_checkpoint("animation_idle", {
			"matchId": str(state.get("matchId", "")),
			"turnNumber": int(state.get("turnNumber", 0)),
		})
		_did_idle = true
	if _launch_mode == "demo":
		get_tree().quit()

func _on_store_changed(_value: Variant) -> void:
	_spectator_hud.refresh()

func _build_demo_frames() -> Array:
	var board_columns := 4
	var board_rows := 2

	return [
		_build_demo_state(
			"DeploymentPhase",
			0,
			1,
			0,
			{
				"matchId": DEMO_MATCH_ID,
				"turnNumber": 0,
				"activePlayerIndex": 1,
				"spectatorCount": 0,
				"validActions": [],
				"players": [
					{
						"id": DEMO_PLAYER_IDS[0],
						"name": "North",
						"lifepoints": 20,
						"handCount": 4,
						"battlefield": _demo_battlefield(board_rows, board_columns, [
							{"row": 1, "col": 0, "face": "A", "suit": "hearts", "value": 1, "hp": 1},
						]),
					},
					{
						"id": DEMO_PLAYER_IDS[1],
						"name": "South",
						"lifepoints": 20,
						"handCount": 4,
						"battlefield": _demo_battlefield(board_rows, board_columns, [
							{"row": 0, "col": 3, "face": "K", "suit": "spades", "value": 11, "hp": 11},
						]),
					},
				],
			}
		),
		_build_demo_state(
			"AttackPhase",
			3,
			0,
			1,
			{
				"matchId": DEMO_MATCH_ID,
				"turnNumber": 3,
				"activePlayerIndex": 0,
				"spectatorCount": 1,
				"combatPreview": [
					{"targetColumn": 1, "verdict": "press"},
					{"targetColumn": 2, "verdict": "guard"},
				],
				"validActions": [
					{"type": "attack"},
					{"type": "pass"},
				],
				"players": [
					{
						"id": DEMO_PLAYER_IDS[0],
						"name": "North",
						"lifepoints": 16,
						"handCount": 3,
						"battlefield": _demo_battlefield(board_rows, board_columns, [
							{"row": 1, "col": 0, "face": "A", "suit": "hearts", "value": 1, "hp": 1},
							{"row": 1, "col": 2, "face": "Q", "suit": "diamonds", "value": 11, "hp": 9},
						]),
					},
					{
						"id": DEMO_PLAYER_IDS[1],
						"name": "South",
						"lifepoints": 13,
						"handCount": 2,
						"battlefield": _demo_battlefield(board_rows, board_columns, [
							{"row": 0, "col": 1, "face": "K", "suit": "spades", "value": 11, "hp": 8},
							{"row": 0, "col": 3, "face": "7", "suit": "clubs", "value": 7, "hp": 4},
						]),
					},
				],
			}
		),
		_build_demo_state(
			"gameOver",
			6,
			1,
			2,
			{
				"matchId": DEMO_MATCH_ID,
				"turnNumber": 6,
				"activePlayerIndex": 1,
				"spectatorCount": 2,
				"outcome": {
					"winnerIndex": 0,
					"victoryType": "lpDepletion",
					"turnNumber": 6,
				},
				"validActions": [],
				"players": [
					{
						"id": DEMO_PLAYER_IDS[0],
						"name": "North",
						"lifepoints": 2,
						"handCount": 1,
						"battlefield": _demo_battlefield(board_rows, board_columns, [
							{"row": 1, "col": 1, "face": "K", "suit": "hearts", "value": 11, "hp": 11},
						]),
					},
					{
						"id": DEMO_PLAYER_IDS[1],
						"name": "South",
						"lifepoints": 0,
						"handCount": 0,
						"battlefield": _demo_battlefield(board_rows, board_columns, []),
					},
				],
			}
		),
	]

func _build_demo_state(phase: String, turn_number: int, active_player_index: int, spectator_count: int, payload: Dictionary) -> Dictionary:
	var frame: Dictionary = {
		"matchId": payload.get("matchId", DEMO_MATCH_ID),
		"phase": phase,
		"turnNumber": turn_number,
		"activePlayerIndex": active_player_index,
		"viewerIndex": null,
		"params": {
			"rows": 2,
			"columns": 4,
		},
		"players": payload.get("players", []),
		"validActions": payload.get("validActions", []),
		"spectatorCount": spectator_count,
	}

	if payload.has("combatPreview"):
		frame.combatPreview = payload.combatPreview
	if payload.has("outcome"):
		frame.outcome = payload.outcome

	return frame

func _demo_battlefield(rows: int, columns: int, items: Array) -> Array:
	var board: Array = []
	board.resize(rows * columns)
	for index in range(board.size()):
		board[index] = null

	for item in items:
		var row: int = int(item.get("row", 0))
		var col: int = int(item.get("col", 0))
		var index: int = row * columns + col
		if index >= 0 and index < board.size():
			board[index] = {
				"card": {
					"id": "demo-%d-%d" % [row, col],
					"suit": item.get("suit", "spades"),
					"face": item.get("face", "A"),
					"value": int(item.get("value", 1)),
					"type": "number",
				},
				"position": {
					"row": row,
					"col": col,
				},
				"currentHp": int(item.get("hp", 1)),
				"faceDown": false,
			}

	return board

func _shorten_id(value: String) -> String:
	if value.length() <= 12:
		return value
	return "%s...%s" % [value.substr(0, 8), value.substr(value.length() - 4, 4)]

func _shorten_watch_url(value: String) -> String:
	if value.length() <= 36:
		return value
	return "%s..." % value.substr(0, 33)

func _shorten_viewer(value: Variant) -> String:
	if value == null:
		return "spectator"
	return "P%d" % (int(value) + 1)
