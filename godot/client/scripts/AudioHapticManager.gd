class_name AudioHapticManager
extends Node

var _store
var _is_headless := false

func _init(store) -> void:
	_store = store
	_is_headless = DisplayServer.get_name() == "headless"

func play_cue(type: String, metadata: Dictionary = {}) -> void:
	if _is_headless:
		_store.record_automation_checkpoint("cue_playback", {
			"type": type,
			"metadata": metadata
		})
		return
		
	# In a full implementation, we'd look up AudioStream assets.
	# For now, we print to stdout to prove wiring and avoid empty AudioStreamPlayer warnings.
	print("PLAY AUDIO CUE: ", type, " ", metadata)
	
	if type in ["combat_hit", "lp_damage", "error"]:
		if OS.has_feature("mobile"):
			var intensity = 50
			if type == "lp_damage":
				intensity = 100
			elif type == "error":
				intensity = 20
			Input.vibrate_handheld(intensity)
	
	# Still record it for automation harness if it expects it
	if _store != null and _store.has_method("record_automation_checkpoint"):
		_store.record_automation_checkpoint("cue_playback", {
			"type": type,
			"metadata": metadata
		})
