extends Control
class_name MatchRoot

signal game_over(state)
signal narration_line_emitted(text: String, suit_color: String)

const GameViewStoreScript = preload("res://scripts/GameViewStore.gd")
const ThemeManager = preload("res://scripts/ThemeManager.gd")
const ReplayControllerScript = preload("res://scripts/ReplayController.gd")
const ConnectionClientScript = preload("res://scripts/ConnectionClient.gd")
const JuiceManagerScript = preload("res://scripts/JuiceManager.gd")
const AudioHapticManagerScript = preload("res://scripts/AudioHapticManager.gd")
const NarrationProducerScript = preload("res://scripts/NarrationProducer.gd")
const SpectatorHudScript = preload("res://scenes/SpectatorHud.gd")
const BattlefieldScene = preload("res://scenes/Battlefield.tscn")
const GameOverScreenScene = preload("res://scenes/GameOverScreen.tscn")

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
var _juice_manager
var _audio_haptic_manager
var _opponent_battlefield
var _player_battlefield
var _spectator_hud
var _status_label: Label
var _mode_label: Label
var _timeline_label: Label
var _top_hand_row: HBoxContainer
var _bottom_hand_row: HBoxContainer
var _hand_label: Label
var _did_hydrate: bool = false
var _did_idle: bool = false
var _demo_frames: Array = []
var _artifact_dir: String = ""
var _screenshots_dir: String = ""
var _screenshots: Array[String] = []
var _artifact_errors: Array[String] = []
var _captured_frame_keys: Dictionary = {}
var _pending_captures: int = 0
var _capture_index: int = 0
var _finishing_run: bool = false
var _headless_capture_error_recorded: bool = false
var _last_log_count: int = 0
var _game_over_played: bool = false
var _prev_lp: Array = []

func configure(launch_options: Dictionary) -> void:
	_launch_options = launch_options.duplicate(true)
	if is_node_ready():
		_prepare_artifacts()
		_apply_launch_options()

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	_build_ui()
	_prepare_artifacts()
	_build_runtime()
	_apply_launch_options()

func _build_ui() -> void:
	var root := ColorRect.new()
	var mat := ShaderMaterial.new()
	mat.shader = preload("res://scenes/PhantasmalBackground.gdshader")
	root.material = mat
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)

	var outer := MarginContainer.new()
	outer.set_anchors_preset(Control.PRESET_FULL_RECT)
	outer.add_theme_constant_override("margin_left", 0)
	outer.add_theme_constant_override("margin_top", 0)
	outer.add_theme_constant_override("margin_right", 0)
	outer.add_theme_constant_override("margin_bottom", 0)
	add_child(outer)

	var stack := VBoxContainer.new()
	stack.set_anchors_preset(Control.PRESET_FULL_RECT)
	stack.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	stack.size_flags_vertical = Control.SIZE_EXPAND_FILL
	stack.add_theme_constant_override("separation", 0)
	outer.add_child(stack)

	var hud_top := HBoxContainer.new()
	hud_top.custom_minimum_size = Vector2(0, 42)
	hud_top.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hud_top.add_theme_constant_override("separation", 12)
	stack.add_child(hud_top)

	_mode_label = Label.new()
	_mode_label.text = "T0"
	_mode_label.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
	_mode_label.add_theme_font_size_override("font_size", 18)
	_mode_label.custom_minimum_size = Vector2(64, 0)
	_mode_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_mode_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	hud_top.add_child(_mode_label)

	_timeline_label = Label.new()
	_timeline_label.text = "DEMO_STREAM"
	_timeline_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_timeline_label.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
	_timeline_label.add_theme_font_size_override("font_size", 13)
	_timeline_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_timeline_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hud_top.add_child(_timeline_label)

	_status_label = Label.new()
	_status_label.text = "LIVE: DEMO"
	_status_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_status_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_status_label.add_theme_color_override("font_color", ThemeManager.get_color("blue"))
	_status_label.add_theme_font_size_override("font_size", 18)
	_status_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	hud_top.add_child(_status_label)

	var body := HBoxContainer.new()
	body.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	body.size_flags_vertical = Control.SIZE_EXPAND_FILL
	body.add_theme_constant_override("separation", 0)
	stack.add_child(body)

	var play_panel := PanelContainer.new()
	play_panel.custom_minimum_size = Vector2(900, 0)
	play_panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	play_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	play_panel.add_theme_stylebox_override("panel", _panel_style(ThemeManager.get_color("bg"), Color(0.10, 0.10, 0.13)))
	body.add_child(play_panel)

	var play_area := VBoxContainer.new()
	play_area.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	play_area.size_flags_vertical = Control.SIZE_EXPAND_FILL
	play_area.add_theme_constant_override("separation", 0)
	play_panel.add_child(play_area)

	var opponent_zone := VBoxContainer.new()
	opponent_zone.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	opponent_zone.add_theme_constant_override("separation", 4)
	play_area.add_child(opponent_zone)

	var opponent_label := Label.new()
	opponent_label.text = "OPPONENT"
	opponent_label.add_theme_color_override("font_color", ThemeManager.get_color("gold_dim"))
	opponent_label.add_theme_font_size_override("font_size", 12)
	opponent_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	opponent_zone.add_child(opponent_label)

	_opponent_battlefield = BattlefieldScene.instantiate()
	_opponent_battlefield.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_opponent_battlefield.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_opponent_battlefield.action_requested.connect(_on_action_requested)
	_opponent_battlefield.invalid_action_attempted.connect(_on_invalid_action_attempted)
	opponent_zone.add_child(_opponent_battlefield)

	var divider := HBoxContainer.new()
	divider.custom_minimum_size = Vector2(0, 48)
	divider.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	divider.add_theme_constant_override("separation", 16)
	divider.alignment = BoxContainer.ALIGNMENT_CENTER
	play_area.add_child(divider)

	var hostile_stats := Label.new()
	hostile_stats.text = "HOSTILE"
	hostile_stats.add_theme_color_override("font_color", ThemeManager.get_color("gold_dim"))
	hostile_stats.add_theme_font_size_override("font_size", 11)
	hostile_stats.custom_minimum_size = Vector2(120, 0)
	hostile_stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	divider.add_child(hostile_stats)

	var phase_label := Label.new()
	phase_label.text = "DEPLOYMENT"
	phase_label.add_theme_color_override("font_color", ThemeManager.get_color("gold"))
	phase_label.add_theme_font_size_override("font_size", 14)
	phase_label.custom_minimum_size = Vector2(200, 0)
	phase_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	divider.add_child(phase_label)
	_hand_label = phase_label

	var operative_stats := Label.new()
	operative_stats.text = "OPERATIVE"
	operative_stats.add_theme_color_override("font_color", ThemeManager.get_color("gold_dim"))
	operative_stats.add_theme_font_size_override("font_size", 11)
	operative_stats.custom_minimum_size = Vector2(120, 0)
	operative_stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	divider.add_child(operative_stats)

	var player_zone := VBoxContainer.new()
	player_zone.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	player_zone.add_theme_constant_override("separation", 4)
	play_area.add_child(player_zone)

	_player_battlefield = BattlefieldScene.instantiate()
	_player_battlefield.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_player_battlefield.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_player_battlefield.action_requested.connect(_on_action_requested)
	_player_battlefield.invalid_action_attempted.connect(_on_invalid_action_attempted)
	player_zone.add_child(_player_battlefield)

	var player_label := Label.new()
	player_label.text = "PLAYER"
	player_label.add_theme_color_override("font_color", ThemeManager.get_color("gold_dim"))
	player_label.add_theme_font_size_override("font_size", 12)
	player_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	player_zone.add_child(player_label)

	var info_bar := PanelContainer.new()
	info_bar.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info_bar.add_theme_stylebox_override("panel", _panel_style(ThemeManager.get_color("bg"), Color(0.13, 0.13, 0.16)))
	play_area.add_child(info_bar)

	var info_content := HBoxContainer.new()
	info_content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	info_content.alignment = BoxContainer.ALIGNMENT_CENTER
	info_content.add_theme_constant_override("separation", 10)
	info_bar.add_child(info_content)

	var command_label := Label.new()
	command_label.text = "COMMAND_CONSOLE"
	command_label.add_theme_color_override("font_color", ThemeManager.get_color("gold_dim"))
	command_label.add_theme_font_size_override("font_size", 12)
	command_label.custom_minimum_size = Vector2(130, 0)
	info_content.add_child(command_label)

	_bottom_hand_row = HBoxContainer.new()
	_bottom_hand_row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_bottom_hand_row.alignment = BoxContainer.ALIGNMENT_CENTER
	_bottom_hand_row.add_theme_constant_override("separation", 10)
	info_content.add_child(_bottom_hand_row)

	_top_hand_row = HBoxContainer.new()
	_top_hand_row.custom_minimum_size = Vector2(0, 0)
	_top_hand_row.visible = false

	_spectator_hud = SpectatorHudScript.new()
	_spectator_hud.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_spectator_hud.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_spectator_hud.custom_minimum_size = Vector2(380, 0)
	body.add_child(_spectator_hud)

	self.narration_line_emitted.connect(_spectator_hud.add_narration_line)

func _on_automation_checkpoint_changed(new_checkpoint: String) -> void:
	# Capture a frame upon automation checkpoint
	_capture_artifact_frame(_store.game_view_state)

func _build_runtime() -> void:
	_store = GameViewStoreScript.new()
	add_child(_store)
	_store.automation_checkpoint_changed.connect(_on_automation_checkpoint_changed)

	_replay_controller = ReplayControllerScript.new()

	add_child(_replay_controller)
	_replay_controller.frame_changed.connect(_on_frame_changed)
	_replay_controller.playback_finished.connect(_on_playback_finished)

	_opponent_battlefield.bind_store(_store)
	_player_battlefield.bind_store(_store)
	_spectator_hud.bind_store(_store)

	_connection_client = ConnectionClientScript.new(_store, _replay_controller)
	add_child(_connection_client)
	_connection_client.match_created.connect(_on_match_created)

	_store.selected_card_id_changed.connect(func(_new_id):
		_render_hand(_store.game_view_state)
		_opponent_battlefield._refresh()
		_player_battlefield._refresh()
	)
	_store.selected_slot_idx_changed.connect(func(_new_idx):
		_render_hand(_store.game_view_state)
		_opponent_battlefield._refresh()
		_player_battlefield._refresh()
	)

	_juice_manager = JuiceManagerScript.new(self)
	add_child(_juice_manager)
	_opponent_battlefield.juice_manager = _juice_manager
	_player_battlefield.juice_manager = _juice_manager

	_audio_haptic_manager = AudioHapticManagerScript.new(_store)
	add_child(_audio_haptic_manager)

	_store.connection_state_changed.connect(_on_store_changed)
	_store.game_view_state_changed.connect(_on_store_changed)
	_store.automation_checkpoint_changed.connect(_on_store_changed)

	_store.record_automation_checkpoint("connected", {
		"mode": str(_launch_options.get("mode", "demo")),
	})

func _apply_launch_options() -> void:
	_launch_mode = str(_launch_options.get("mode", "demo"))
	_mode_label.text = "T0"

	if _launch_mode == "live":
		var watch_url: String = str(_launch_options.get("watch_url", ""))
		var match_id: String = str(_launch_options.get("match_id", ""))
		if watch_url == "" or match_id == "":
			_launch_mode = "demo"
			_status_label.text = "Live mode requires --watch-url and --match-id"
			_timeline_label.text = "Timeline: falling back to demo replay"
			_start_demo()
			return

		_status_label.text = "LIVE: %s" % _shorten_watch_url(watch_url)
		_timeline_label.text = "WAITING %s" % _shorten_id(match_id)
		_connection_client.watch_match(match_id)
		_connection_client.connect_to_server(watch_url)
		return

	if _launch_mode == "create":
		_status_label.text = "PHX: INITIALIZING"
		_timeline_label.text = "MATCH_SYNC_IN_PROGRESS"
		# Default to production server if not specified
		var server_url := str(_launch_options.get("watch_url", "ws://127.0.0.1:3001/ws"))
		if not server_url.contains("/ws"):
			server_url = _path_join(server_url, "ws")
		
		_connection_client.connect_to_server(server_url)
		# ConnectionClient will emit STATE_OPEN, then we trigger create_match
		return

	_status_label.text = "LIVE: DEMO"
	_timeline_label.text = "DEMO_STREAM"
	_start_demo()

func _start_demo() -> void:
	_did_hydrate = false
	_did_idle = false
	var input_path = str(_launch_options.get("input_replay", ""))
	if input_path != "":
		var file = FileAccess.open(input_path, FileAccess.READ)
		if file != null:
			var text = file.get_as_text()
			var json = JSON.new()
			var err = json.parse(text)
			if err == OK:
				var data = json.get_data()
				if data is Array:
					_demo_frames = data
				else:
					push_error("Replay data is not an array")
					_demo_frames = _build_demo_frames()
			else:
				push_error("JSON parse error: " + str(err))
				_demo_frames = _build_demo_frames()
		else:
			push_error("Could not open input replay file: " + input_path)
			_demo_frames = _build_demo_frames()
	else:
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

	_mode_label.text = "T%d" % turn_number
	_status_label.text = _turn_status(snapshot)
	_timeline_label.text = "%s  %d WATCHING" % [_phase_label_for(phase), spectator_count]
	_render_hand(snapshot)
	_queue_transaction_log(snapshot)

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

	if viewer_index != null:
		_timeline_label.text = "%s  VIEWER %s" % [_phase_label_for(phase), _shorten_viewer(viewer_index)]
	else:
		_timeline_label.text = "%s  SPECTATOR" % [_phase_label_for(phase)]

	_capture_artifact_frame(snapshot)

func _on_playback_finished() -> void:
	if not _did_idle:
		var state: Dictionary = _store.game_view_state
		_store.record_automation_checkpoint("animation_idle", {
			"matchId": str(state.get("matchId", "")),
			"turnNumber": int(state.get("turnNumber", 0)),
		})
		_did_idle = true
	call_deferred("_finish_run")

func _on_match_created(match_id: String, player_id: String) -> void:
	print("Match created: ", match_id, " player: ", player_id)
	_status_label.text = "PHX: MATCH_READY"
	_timeline_label.text = "SYNCED %s" % _shorten_id(match_id)
	# After creation, we behave like a live watch but with player auth context potentially
	_connection_client.watch_match(match_id)

func _on_invalid_action_attempted() -> void:
	if _audio_haptic_manager != null:
		_audio_haptic_manager.play_cue("error")

func _on_action_requested(type: String, payload: Dictionary) -> void:
	if _connection_client != null:
		var match_id := ""
		var player_id := ""
		var state: Dictionary = _store.game_view_state
		var viewer_index = state.get("viewerIndex", null)
		if viewer_index == null:
			return # spectators cannot submit actions
		if not state.is_empty():
			match_id = str(state.get("matchId", ""))
		
		# For now, we assume the viewer is the actor if we have session data
		# In a real scenario, we'd retrieve this from a local SecureStore or AuthStore
		
		var action_obj = payload.duplicate()
		action_obj["type"] = type
		
		_connection_client.send_message({
			"type": "submitAction",
			"matchId": match_id,
			"action": action_obj
		})

func _on_store_changed(_value: Variant) -> void:
	if _launch_mode == "create" and _store.connection_state == GameViewStoreScript.ConnectionState.OPEN:
		if _connection_client.watch_match_id == "":
			_connection_client.create_match(_launch_options)
	
	_spectator_hud.refresh()
	
	var state: Dictionary = _store.game_view_state
	if not state.is_empty():
		_queue_transaction_log(state)
		
	if not state.is_empty() and str(state.get("phase", "")) == "gameOver":
		if _artifact_dir != "":
			if not _game_over_played:
				_game_over_played = true
				var go = GameOverScreenScene.instantiate()
				add_child(go)
				go.configure({"game_view_state": state})
				call_deferred("_finish_run")
			return
		emit_signal("game_over", state)

func _render_hand(state: Dictionary) -> void:
	if _bottom_hand_row == null:
		return
	for child in _bottom_hand_row.get_children():
		child.queue_free()

	var players: Array = state.get("players", [])
	if players.is_empty():
		return

	var viewer_index = state.get("viewerIndex", null)
	var is_spectator = viewer_index == null
	var my_idx = 0 if is_spectator else int(viewer_index)

	var player: Dictionary = players[my_idx] if my_idx < players.size() else {}
	var hand: Array = player.get("hand", [])
	var hand_count: int = int(player.get("handCount", 0))

	if hand.is_empty():
		if hand_count > 0:
			for j in range(hand_count):
				_bottom_hand_row.add_child(_build_hand_card({"suit": "?", "face": "?"}, false))
		else:
			var empty := Label.new()
			empty.text = "NO CARDS IN HAND"
			empty.add_theme_color_override("font_color", Color(0.45, 0.45, 0.50))
			empty.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
			_bottom_hand_row.add_child(empty)
	else:
		for card in hand:
			_bottom_hand_row.add_child(_build_hand_card(card, false))

func _build_hand_card(card: Dictionary, is_opponent: bool = false) -> Control:
	var card_id = str(card.get("id", ""))
	var _state: Dictionary = _store.game_view_state if _store != null else {}
	var is_spectator = _state.get("viewerIndex", null) == null
	var is_selected = _store != null and _store.selected_card_id == card_id and card_id != "" and not is_spectator and not is_opponent

	var valid_actions: Array = _state.get("validActions", [])
	var is_playable = false
	var is_reinforce_playable = false
	if _store != null and not is_opponent:
		for action in valid_actions:
			if not action is Dictionary: continue
			if str(action.get("cardId", "")) == card_id:
				if str(action.get("type", "")) == "deploy":
					is_playable = true
				elif str(action.get("type", "")) == "reinforce":
					is_reinforce_playable = true

	var PhxCardScript = preload("res://scripts/PhxCard.gd")
	var phx_card = PhxCardScript.new(PhxCardScript.Mode.HAND)
	phx_card.setup_hand(card, is_selected, is_playable, is_reinforce_playable, is_spectator)
	
	if _store != null:
		_store.register_test_id(phx_card, "hand-card-%s" % card_id)

	phx_card.clicked.connect(func():
		if card_id != "" and _store != null:
			if _store.selected_card_id == card_id:
				_store.selected_card_id = ""
			else:
				_store.selected_card_id = card_id
	)
	
	return phx_card

func _prepare_artifacts() -> void:
	_artifact_dir = str(_launch_options.get("artifact_dir", ""))
	_screenshots.clear()
	_artifact_errors.clear()
	_captured_frame_keys.clear()
	_pending_captures = 0
	_capture_index = 0
	_finishing_run = false
	_headless_capture_error_recorded = false
	_screenshots_dir = ""

	if _artifact_dir == "":
		return
	if not bool(_launch_options.get("capture_screenshots", false)):
		return

	_screenshots_dir = _path_join(_artifact_dir, "screenshots")
	var err := DirAccess.make_dir_recursive_absolute(_screenshots_dir)
	if err != OK:
		_artifact_errors.append("unable to create screenshots dir: %s" % _screenshots_dir)
		_screenshots_dir = ""

func _capture_artifact_frame(snapshot: Dictionary) -> void:
	if _screenshots_dir == "":
		return

	var phase: String = str(snapshot.get("phase", "unknown"))
	var turn_number: int = int(snapshot.get("turnNumber", 0))
	var key := "%s:%d" % [phase, turn_number]
	if _captured_frame_keys.has(key):
		return

	_captured_frame_keys[key] = true
	_pending_captures += 1
	call_deferred("_save_artifact_frame", snapshot.duplicate(true))

func _save_artifact_frame(snapshot: Dictionary) -> void:
	if DisplayServer.get_name() == "headless":
		if not _headless_capture_error_recorded:
			_artifact_errors.append("unable to capture screenshots with Godot headless dummy renderer")
			_headless_capture_error_recorded = true
		_pending_captures -= 1
		return

	await RenderingServer.frame_post_draw

	var phase: String = str(snapshot.get("phase", "unknown"))
	var phase_slug := _phase_slug(phase)
	var turn_number: int = int(snapshot.get("turnNumber", 0))
	var label := _capture_label(phase)
	var file_name := "t%s_%s_%s_%s.png" % [
		_pad_int(turn_number, 4),
		phase_slug,
		_pad_int(_capture_index, 4),
		label,
	]
	_capture_index += 1
	var absolute_path := _path_join(_screenshots_dir, file_name)
	var relative_path := _path_join("screenshots", file_name)
	var texture := get_viewport().get_texture()
	if texture == null:
		_artifact_errors.append("unable to capture %s: missing viewport texture" % relative_path)
		_pending_captures -= 1
		return

	var image := texture.get_image()
	if image == null:
		_artifact_errors.append("unable to capture %s: missing viewport image" % relative_path)
		_pending_captures -= 1
		return

	var err := image.save_png(absolute_path)
	if err == OK:
		_screenshots.append(relative_path)
	else:
		_artifact_errors.append("unable to save %s: %d" % [relative_path, err])
	_pending_captures -= 1

func _finish_run() -> void:
	if _finishing_run:
		return
	_finishing_run = true

	var attempts := 0
	while _pending_captures > 0 and attempts < 60:
		await get_tree().process_frame
		attempts += 1

	if _pending_captures > 0:
		_artifact_errors.append("timed out waiting for %d screenshot capture(s)" % _pending_captures)
		_pending_captures = 0

	_write_artifact_result()
	get_tree().quit()

func _write_artifact_result() -> void:
	if _artifact_dir == "":
		return

	var result := {
		"ok": _artifact_errors.is_empty(),
		"errors": _artifact_errors.duplicate(),
		"screenshotCount": _screenshots.size(),
		"screenshots": _screenshots.duplicate(),
		"checkpoints": _store.checkpoint_history.duplicate(true),
		"uiMap": _store.test_id_map.duplicate(),
		"summary": _build_result_summary(_store.game_view_state),
	}
	var result_path := _path_join(_artifact_dir, "result.json")
	var file := FileAccess.open(result_path, FileAccess.WRITE)
	if file == null:
		push_error("Unable to write Godot playthrough result: %s" % result_path)
		return
	file.store_string(JSON.stringify(result, "\t"))

func _build_result_summary(state: Dictionary) -> Dictionary:
	var players: Array = state.get("players", [])
	var names: Array[String] = []
	var lp_chunks: Array[String] = []
	var final_lifepoints: Dictionary = {}
	for index in range(players.size()):
		var player: Dictionary = players[index]
		var player_meta: Dictionary = player.get("player", {}) if player.get("player") is Dictionary else {}; var name := str(player_meta.get("name", "P%d" % (index + 1)))
		var lifepoints := int(player.get("lifepoints", 0))
		names.append(name)
		lp_chunks.append("%s: %d LP" % [name, lifepoints])
		final_lifepoints[name] = lifepoints

	var outcome_value: Variant = state.get("outcome", {})
	var outcome: Dictionary = outcome_value if outcome_value is Dictionary else {}
	var winner_index := int(outcome.get("winnerIndex", -1))
	var winner_name := ""
	if winner_index >= 0 and winner_index < names.size():
		winner_name = names[winner_index]
	var victory_label := _victory_label(str(outcome.get("victoryType", "")))
	var turn_number := int(outcome.get("turnNumber", state.get("turnNumber", 0)))
	var victory_summary := ""
	if victory_label != "":
		victory_summary = "%s on turn %d" % [victory_label, turn_number]

	return {
		"outcomeText": "%s Wins!" % winner_name if winner_name != "" else null,
		"winnerName": winner_name,
		"victorySummaryText": victory_summary,
		"lifepointsText": " | ".join(lp_chunks),
		"finalLifepoints": final_lifepoints,
		"turnCount": int(state.get("turnNumber", 0)),
		"actionCount": state.get("transactionLog", []).size(),
		"phase": str(state.get("phase", "unknown")),
	}

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
						"hand": _demo_hand([
							{"face": "Q", "suit": "clubs", "value": 11},
							{"face": "T", "suit": "diamonds", "value": 10},
							{"face": "3", "suit": "hearts", "value": 3},
							{"face": "3", "suit": "spades", "value": 3},
						]),
						"battlefield": _demo_battlefield(board_rows, board_columns, [
							{"row": 1, "col": 0, "face": "A", "suit": "hearts", "value": 1, "hp": 1},
						]),
					},
					{
						"id": DEMO_PLAYER_IDS[1],
						"name": "South",
						"lifepoints": 20,
						"handCount": 4,
						"hand": [],
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
						"hand": _demo_hand([
							{"face": "Q", "suit": "clubs", "value": 11},
							{"face": "T", "suit": "diamonds", "value": 10},
							{"face": "3", "suit": "hearts", "value": 3},
						]),
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
						"hand": [],
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
						"hand": _demo_hand([
							{"face": "K", "suit": "hearts", "value": 11},
						]),
						"battlefield": _demo_battlefield(board_rows, board_columns, [
							{"row": 1, "col": 1, "face": "K", "suit": "hearts", "value": 11, "hp": 11},
						]),
					},
					{
						"id": DEMO_PLAYER_IDS[1],
						"name": "South",
						"lifepoints": 0,
						"handCount": 0,
						"hand": [],
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

func _demo_hand(items: Array) -> Array:
	var hand: Array = []
	for index in range(items.size()):
		var item: Dictionary = items[index]
		hand.append({
			"id": "demo-hand-%d" % index,
			"suit": item.get("suit", "spades"),
			"face": item.get("face", "A"),
			"value": int(item.get("value", 1)),
			"type": "number",
		})
	return hand

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

var _transaction_queue: Array = []
var _is_processing_tx: bool = false

func _queue_transaction_log(state: Dictionary) -> void:
	var tx_log: Array = state.get("transactionLog", [])
	if tx_log.size() > _last_log_count:
		var new_entries = tx_log.slice(_last_log_count, tx_log.size())
		for entry in new_entries:
			_transaction_queue.append(entry)
		_last_log_count = tx_log.size()
		
		if not _is_processing_tx:
			_process_queue()
			
	if str(state.get("phase", "")) == "gameOver" and _transaction_queue.is_empty():
		_trigger_game_over()

func _trigger_game_over() -> void:
	if not _game_over_played:
		if _audio_haptic_manager != null:
			_audio_haptic_manager.play_cue("victory")
		_game_over_played = true

func _process_queue() -> void:
	if _transaction_queue.is_empty():
		_is_processing_tx = false
		_trigger_game_over_if_ready()
		return
		
	_is_processing_tx = true
	var entry = _transaction_queue.pop_front()
	var state: Dictionary = _store.game_view_state if _store != null else {}
	
	if entry is Dictionary:
		var detail = entry.get("details", {})
		if not detail or not detail is Dictionary or detail.is_empty():
			detail = entry.get("action", {})
		if detail is Dictionary:
			var action_type = str(detail.get("type", ""))
			if action_type == "deploy":
				var nar = NarrationProducerScript.format_deploy(detail, state)
				emit_signal("narration_line_emitted", nar.text, nar.suit)
				if _audio_haptic_manager != null:
					_audio_haptic_manager.play_cue("deploy")
				await get_tree().create_timer(0.2).timeout
			var combat = detail.get("combat")
			if combat is Dictionary:
				if _audio_haptic_manager != null:
					_audio_haptic_manager.play_cue("combat", {"targetColumn": combat.get("targetColumn", -1)})
				await get_tree().create_timer(0.3).timeout
				
				var attacker_card = combat.get("attackerCard", {})
				var attacker_idx = int(combat.get("attackerPlayerIndex", 0))
				var target_col = int(combat.get("targetColumn", -1))
				var defender_idx = 1 if attacker_idx == 0 else 0
				
				var attacker_col = -1
				var action_dict = entry.get("action", {})
				if action_dict is Dictionary and str(action_dict.get("type", "")) == "attack":
					attacker_col = int(action_dict.get("attackingColumn", -1))
					
				if attacker_col != -1 and target_col != -1:
					_opponent_battlefield.animate_combat_strike(attacker_idx, attacker_col, defender_idx, target_col)
					_player_battlefield.animate_combat_strike(attacker_idx, attacker_col, defender_idx, target_col)
				
				var steps: Array = combat.get("steps", [])
				for step in steps:
					if not step is Dictionary: continue
					
					var is_suppressed_only = false
					var bonuses: Array = step.get("bonuses", [])
					if bonuses.size() > 0:
						var all_suppressed = true
						for b in bonuses:
							if not NarrationProducerScript.is_suppressed(str(b)):
								all_suppressed = false
								break
						is_suppressed_only = all_suppressed
					
					if is_suppressed_only:
						continue
						
					var step_dmg = int(step.get("damage", 0))
					
					var has_narratable_bonus = false
					for b in bonuses:
						if not NarrationProducerScript.is_suppressed(str(b)) and NarrationProducerScript.get_bonus_message(str(b), "card") != "":
							has_narratable_bonus = true
							break
							
					if step_dmg == 0 and not has_narratable_bonus:
						continue
					
					if step_dmg > 0 and _audio_haptic_manager != null:
						_audio_haptic_manager.play_cue("combat_hit", {"damage": step_dmg})
						
					if target_col != -1:
						_opponent_battlefield.animate_combat_hit(defender_idx, target_col, step_dmg)
						_player_battlefield.animate_combat_hit(defender_idx, target_col, step_dmg)
					
					if step_dmg > 0 or (step_dmg == 0 and not has_narratable_bonus):
						var target = str(step.get("target", ""))
						match target:
							"frontCard", "backCard":
								if target == "backCard":
									var nar = NarrationProducerScript.format_attack_step_overflow(step, attacker_card)
									emit_signal("narration_line_emitted", nar.text, nar.suit)
								else:
									var nar = NarrationProducerScript.format_attack_step_attack(step, attacker_card)
									emit_signal("narration_line_emitted", nar.text, nar.suit)
								if bool(step.get("destroyed", false)):
									var d_nar = NarrationProducerScript.format_attack_step_destroyed(step)
									emit_signal("narration_line_emitted", d_nar.text, d_nar.suit)
							"playerLp":
								var nar = NarrationProducerScript.format_attack_step_lp(step, state, attacker_card, attacker_idx)
								emit_signal("narration_line_emitted", nar.text, nar.suit)

					for label in bonuses:
						var bstr = str(label)
						if NarrationProducerScript.is_suppressed(bstr): continue
						var msg = NarrationProducerScript.get_bonus_message(bstr, NarrationProducerScript.format_card(step.get("card", {})) if step.has("card") else "card")
						if msg != "":
							var suit = str(step.get("card", {}).get("suit", attacker_card.get("suit", "spades")))
							emit_signal("narration_line_emitted", msg, suit)
							if _audio_haptic_manager != null:
								_audio_haptic_manager.play_cue("combat_bonus", {"label": bstr})
								
					await get_tree().create_timer(0.4).timeout
				
				var lp_damage = int(combat.get("totalLpDamage", 0))
				if lp_damage > 0:
					if _audio_haptic_manager != null:
						_audio_haptic_manager.play_cue("lp_damage", {"amount": lp_damage})
					if _juice_manager != null:
						_juice_manager.shake(15.0)
						_juice_manager.flash(Color(0.8, 0.1, 0.1, 0.3), 0.15)
				await get_tree().create_timer(0.5).timeout
	
			elif action_type == "reinforce":
				var nar = NarrationProducerScript.format_reinforce(detail, state)
				emit_signal("narration_line_emitted", nar.text, nar.suit)
				if _audio_haptic_manager != null:
					_audio_haptic_manager.play_cue("reinforce", {"column": int(detail.get("column", 0))})
				await get_tree().create_timer(0.3).timeout

	call_deferred("_process_queue")

func _trigger_game_over_if_ready() -> void:
	var state: Dictionary = _store.game_view_state if _store != null else {}
	if str(state.get("phase", "")) == "gameOver":
		_trigger_game_over()

func _turn_status(state: Dictionary) -> String:
	if str(state.get("phase", "")) == "gameOver":
		var outcome_value: Variant = state.get("outcome", {})
		if outcome_value is Dictionary:
			var players: Array = state.get("players", [])
			var winner_index := int(outcome_value.get("winnerIndex", -1))
			if winner_index >= 0 and winner_index < players.size():
				var winner: Dictionary = players[winner_index]
				return "%s WINS" % str(winner.get("name", "PLAYER")).to_upper()
		return "GAME OVER"
	var active_player_index := int(state.get("activePlayerIndex", 0))
	var players: Array = state.get("players", [])
	if active_player_index >= 0 and active_player_index < players.size():
		var active: Dictionary = players[active_player_index]
		return "LIVE: %s" % str(active.get("name", "PLAYER")).to_upper()
	return "LIVE: DEMO"

func _phase_label_for(phase: String) -> String:
	match phase:
		"DeploymentPhase":
			return "DEPLOYMENT"
		"AttackPhase":
			return "COMBAT"
		"gameOver":
			return "GAME_OVER"
		_:
			return phase.to_upper()

func _suit_token(suit: String) -> String:
	match suit:
		"spades":
			return "S"
		"hearts":
			return "H"
		"diamonds":
			return "D"
		"clubs":
			return "C"
		_:
			return "?"

func _suit_color(suit: String) -> Color:
	match suit:
		"spades", "clubs":
			return Color(0.05, 0.50, 1.0)
		"hearts", "diamonds":
			return Color(1.0, 0.12, 0.32)
		_:
			return Color(0.95, 0.72, 0.25)

func _card_bg(suit: String) -> Color:
	match suit:
		"spades", "clubs":
			return Color(0.02, 0.06, 0.105)
		"hearts", "diamonds":
			return Color(0.105, 0.025, 0.045)
		_:
			return Color(0.05, 0.055, 0.07)

func _panel_style(bg: Color, border: Color) -> StyleBoxFlat:
	return _card_style(bg, border, 0)

func _card_style(bg: Color, border: Color, radius: int, border_width: int = 1) -> StyleBoxFlat:
	var style := StyleBoxFlat.new()
	style.bg_color = bg
	style.border_color = border
	style.set_border_width_all(border_width)
	style.corner_radius_top_left = radius
	style.corner_radius_top_right = radius
	style.corner_radius_bottom_left = radius
	style.corner_radius_bottom_right = radius
	style.content_margin_left = 14
	style.content_margin_right = 14
	style.content_margin_top = 10
	style.content_margin_bottom = 10
	return style

func _path_join(base: String, child: String) -> String:
	if base.ends_with("/"):
		return "%s%s" % [base, child]
	return "%s/%s" % [base, child]

func _pad_int(value: int, width: int) -> String:
	var text := str(value)
	while text.length() < width:
		text = "0%s" % text
	return text

func _phase_slug(phase: String) -> String:
	match phase:
		"DeploymentPhase":
			return "deployment"
		"AttackPhase":
			return "combat"
		"gameOver":
			return "game-over"
		_:
			return phase.to_lower().replace(" ", "-")

func _capture_label(phase: String) -> String:
	match phase:
		"DeploymentPhase":
			return "start"
		"AttackPhase":
			return "action"
		"gameOver":
			return "game-over"
		_:
			return "frame"

func _victory_label(victory_type: String) -> String:
	match victory_type:
		"lpDepletion":
			return "LP Depletion"
		"cardDepletion":
			return "Card Depletion"
		"passLimit":
			return "Pass Limit Exceeded"
		"forfeit":
			return "Forfeit"
		_:
			return victory_type
