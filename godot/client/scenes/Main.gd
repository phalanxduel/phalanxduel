extends Control

const MatchRootScene = preload("res://scenes/MatchRoot.tscn")
const LobbyScene = preload("res://scenes/Lobby.tscn")
const MatchBrowserScene = preload("res://scenes/MatchBrowser.tscn")
const SpectatorBrowserScene = preload("res://scenes/SpectatorBrowser.tscn")
const LeaderboardScene = preload("res://scenes/LeaderboardScene.tscn")
const GameOverScreenScene = preload("res://scenes/GameOverScreen.tscn")

var _current_scene: Node = null

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	
	var options = _parse_launch_options(OS.get_cmdline_user_args())
	
	# Only skip lobby if a specific match is requested, demo mode, or input replay
	if options.match_id != "" or options.mode == "live" or options.mode == "demo" or options.get("input_replay", "") != "":
		if options.get("input_replay", "") != "":
			options.mode = "demo"
		_launch_match(options)
	else:
		_launch_lobby()

func _launch_lobby() -> void:
	if _current_scene != null:
		_current_scene.queue_free()
	
	var lobby = LobbyScene.instantiate()
	lobby.match_requested.connect(_on_match_requested)
	lobby.browse_requested.connect(_launch_browser)
	lobby.spectate_requested.connect(_launch_spectator_browser)
	lobby.leaderboard_requested.connect(_launch_leaderboard)
	add_child(lobby)
	_current_scene = lobby

func _launch_browser() -> void:
	if _current_scene != null:
		_current_scene.queue_free()
	
	var browser = MatchBrowserScene.instantiate()
	browser.match_selected.connect(_on_match_selected)
	browser.back_requested.connect(_launch_lobby)
	add_child(browser)
	_current_scene = browser

func _launch_spectator_browser() -> void:
	if _current_scene != null:
		_current_scene.queue_free()
	
	var browser = SpectatorBrowserScene.instantiate()
	browser.match_selected.connect(_on_match_selected)
	browser.back_requested.connect(_launch_lobby)
	add_child(browser)
	_current_scene = browser

func _launch_leaderboard() -> void:
	if _current_scene != null:
		_current_scene.queue_free()
	
	var lb = LeaderboardScene.instantiate()
	lb.back_requested.connect(_launch_lobby)
	add_child(lb)
	_current_scene = lb

func _on_match_selected(match_id: String) -> void:
	_launch_match({"match_id": match_id, "mode": "live"})

func _on_match_requested(options: Dictionary) -> void:
	_launch_match(options)

func _launch_match(options: Dictionary) -> void:
	if _current_scene != null:
		_current_scene.queue_free()
	
	var match_root = MatchRootScene.instantiate()
	match_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	match_root.call("configure", options)
	match_root.connect("game_over", _launch_game_over)
	add_child(match_root)
	_current_scene = match_root

func _launch_game_over(state: Dictionary) -> void:
	if _current_scene != null:
		_current_scene.queue_free()
	
	var screen = GameOverScreenScene.instantiate()
	screen.configure({"game_view_state": state})
	screen.play_again_requested.connect(_launch_lobby)
	add_child(screen)
	_current_scene = screen

func _parse_launch_options(args: PackedStringArray) -> Dictionary:
	var options: Dictionary = {
		"mode": "lobby", # Default to lobby if no args
		"watch_url": "",
		"match_id": "",
		"replay_speed": 1.5,
		"artifact_dir": "",
		"capture_screenshots": false,
		"input_replay": "",
	}

	var index: int = 0
	while index < args.size():
		var arg: String = args[index]
		if arg == "--watch-url" and index + 1 < args.size():
			options.mode = "live"
			options.watch_url = args[index + 1]
			index += 2
		elif arg == "--match-id" and index + 1 < args.size():
			options.match_id = args[index + 1]
			index += 2
		elif arg == "--replay-speed" and index + 1 < args.size():
			options.replay_speed = maxf(0.1, float(args[index + 1]))
			index += 2
		elif arg == "--artifact-dir" and index + 1 < args.size():
			options.artifact_dir = args[index + 1]
			index += 2
		elif arg == "--capture-screenshots":
			options.capture_screenshots = true
			index += 1
		elif arg == "--input-replay" and index + 1 < args.size():
			options.input_replay = args[index + 1]
			index += 2
		elif arg == "--live":
			options.mode = "live"
			index += 1
		elif arg == "--demo":
			options.mode = "demo"
			index += 1
		else:
			index += 1

	if options.watch_url != "" and options.match_id != "":
		options.mode = "live"
	elif options.mode == "live" and (options.watch_url == "" or options.match_id == ""):
		options.mode = "lobby"

	return options
