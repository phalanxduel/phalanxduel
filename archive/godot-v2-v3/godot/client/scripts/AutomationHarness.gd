extends SceneTree

const GameViewStoreScript = preload("res://scripts/GameViewStore.gd")

const DEFAULT_CHECKPOINTS := ["connected", "hydrated", "animation_idle"]

func _init() -> void:
	var result: Dictionary = _run()
	var output_path: String = str(result.get("outputPath", ""))
	if output_path != "":
		_write_json(output_path, result)
	print(JSON.stringify(result))
	quit(0 if result.get("ok", false) else 1)

func _run() -> Dictionary:
	var args: Dictionary = _parse_args(OS.get_cmdline_user_args())
	var input_path: String = str(args.get("input", ""))
	var output_path: String = str(args.get("output", ""))
	var result: Dictionary = {
		"ok": false,
		"outputPath": output_path,
		"errors": [],
		"checkpoints": [],
		"transactionLog": [],
		"scenario": {},
	}

	if input_path == "":
		result.errors.append("missing --input")
		return result

	var input: Variant = _read_json(input_path)
	if input == null:
		result.errors.append("unable to read harness input")
		return result
	if not input is Dictionary:
		result.errors.append("harness input must be a dictionary")
		return result

	var input_dict: Dictionary = input
	var scenario: Dictionary = input_dict.get("scenario", {})
	var scenario_errors: Array[String] = _validate_scenario(scenario)
	if not scenario_errors.is_empty():
		result.errors.append_array(scenario_errors)
		return result

	var expected_checkpoints: Array = input_dict.get("expectedCheckpoints", DEFAULT_CHECKPOINTS)
	if not expected_checkpoints is Array or expected_checkpoints.is_empty():
		expected_checkpoints = DEFAULT_CHECKPOINTS

	var store: Variant = GameViewStoreScript.new()
	store.connection_state = GameViewStoreScript.ConnectionState.OPEN
	store.record_automation_checkpoint("connected", {
		"source": "godot-local-qa",
	})

	var game_view_state: Dictionary = _build_game_view_state(scenario)
	store.game_view_state = game_view_state
	store.record_automation_checkpoint("hydrated", {
		"scenarioId": scenario.get("id", ""),
		"turnCount": scenario.get("turnCount", 0),
	})

	store.record_automation_checkpoint("game_over", {
		"actionCount": scenario.get("actions", []).size(),
		"finalStateHash": scenario.get("finalStateHash", ""),
	})

	var missing: Array[String] = _missing_checkpoints(expected_checkpoints, store.checkpoint_history)
	result.ok = missing.is_empty()
	result.checkpoints = store.checkpoint_history
	result.transactionLog = game_view_state.get("transactionLog", [])
	result.scenario = {
		"id": scenario.get("id", ""),
		"seed": scenario.get("seed", 0),
		"damageMode": scenario.get("damageMode", ""),
		"startingLifepoints": scenario.get("startingLifepoints", 0),
		"actionCount": scenario.get("actions", []).size(),
		"turnCount": scenario.get("turnCount", 0),
		"finalStateHash": scenario.get("finalStateHash", ""),
	}
	if not missing.is_empty():
		result.errors.append("missing checkpoints: %s" % ", ".join(missing))
	store.free()
	return result

func _parse_args(args: PackedStringArray) -> Dictionary:
	var parsed: Dictionary = {}
	var index: int = 0
	while index < args.size():
		var arg: String = args[index]
		if arg == "--input" and index + 1 < args.size():
			parsed.input = args[index + 1]
			index += 2
		elif arg == "--output" and index + 1 < args.size():
			parsed.output = args[index + 1]
			index += 2
		else:
			index += 1
	return parsed

func _read_json(path: String) -> Variant:
	if not FileAccess.file_exists(path):
		push_error("Harness input does not exist: %s" % path)
		return null
	var file: FileAccess = FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("Unable to open harness input: %s" % path)
		return null
	var raw: String = file.get_as_text()
	var parsed: Variant = JSON.parse_string(raw)
	if parsed == null:
		push_error("Unable to parse harness input JSON: %s" % path)
	return parsed

func _write_json(path: String, value: Dictionary) -> void:
	var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_error("Unable to write harness output: %s" % path)
		return
	file.store_string(JSON.stringify(value, "\t"))

func _validate_scenario(scenario: Variant) -> Array[String]:
	var errors: Array[String] = []
	if not scenario is Dictionary:
		errors.append("scenario must be a dictionary")
		return errors

	if scenario.get("version", 0) != 1:
		errors.append("scenario.version must be 1")
	if str(scenario.get("id", "")) == "":
		errors.append("scenario.id is required")
	if not scenario.get("actions", []) is Array:
		errors.append("scenario.actions must be an array")
	if str(scenario.get("finalStateHash", "")) == "":
		errors.append("scenario.finalStateHash is required")
	return errors

func _build_game_view_state(scenario: Dictionary) -> Dictionary:
	return {
		"matchId": scenario.get("id", ""),
		"phase": "automation",
		"turnNumber": scenario.get("turnCount", 0),
		"automation": {
			"source": "godot-local-qa",
			"actionCount": scenario.get("actions", []).size(),
			"finalStateHash": scenario.get("finalStateHash", ""),
		},
	}

func _missing_checkpoints(expected: Array, actual: Array[Dictionary]) -> Array[String]:
	var seen: Dictionary = {}
	for checkpoint in actual:
		seen[str(checkpoint.get("type", ""))] = true

	var missing: Array[String] = []
	for checkpoint_type in expected:
		var key: String = str(checkpoint_type)
		if not seen.has(key):
			missing.append(key)
	return missing
