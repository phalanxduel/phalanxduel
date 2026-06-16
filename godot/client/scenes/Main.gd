extends Control

const MatchRootScene = preload("res://scenes/MatchRoot.tscn")

func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)

	var match_root = MatchRootScene.instantiate()
	match_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	match_root.call("configure", _parse_launch_options(OS.get_cmdline_user_args()))
	add_child(match_root)

func _parse_launch_options(args: PackedStringArray) -> Dictionary:
	var options: Dictionary = {
		"mode": "demo",
		"watch_url": "",
		"match_id": "",
		"replay_speed": 1.5,
		"artifact_dir": "",
		"capture_screenshots": false,
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
	elif options.mode == "live":
		options.mode = "demo"

	return options
