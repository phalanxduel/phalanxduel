extends Node
class_name TransactionProcessor

signal event_played(event_type: String, details: Dictionary)

var _store: GameViewStoreScript = null
var _last_log_count: int = 0
var _is_initialized: bool = false
var _event_queue: Array = []
var _is_processing: bool = false

func bind_store(store: GameViewStoreScript) -> void:
	if _store != null:
		return
	_store = store
	_store.game_view_state_changed.connect(_on_store_changed)

func _on_store_changed(_state) -> void:
	var state: Dictionary = _store.game_view_state
	if state.is_empty():
		return
		
	var log_entries: Array = state.get("transactionLog", [])
	var current_count: int = log_entries.size()
	
	if not _is_initialized:
		_last_log_count = current_count
		_is_initialized = true
		return
		
	if current_count > _last_log_count:
		var new_entries = log_entries.slice(_last_log_count, current_count)
		for entry in new_entries:
			_event_queue.append(entry)
		_last_log_count = current_count
		
		if not _is_processing:
			_process_queue()

func _process_queue() -> void:
	if _event_queue.is_empty():
		_is_processing = false
		return
		
	_is_processing = true
	var entry: Dictionary = _event_queue.pop_front()
	
	var details: Dictionary = entry.get("details", {})
	var type: String = str(details.get("type", ""))
	
	if type == "attack":
		await _play_combat_sequence(details)
	elif type == "deploy":
		await _play_deploy_sequence(details)
	# Pass and reinforce can also be handled
	
	emit_signal("event_played", type, details)
	
	# Process next in queue
	call_deferred("_process_queue")

func _play_combat_sequence(details: Dictionary) -> void:
	var combat: Dictionary = details.get("combat", {})
	var target_col: int = int(combat.get("targetColumn", 0))
	var total_lp_damage: int = int(combat.get("totalLpDamage", 0))
	var steps: Array = combat.get("steps", [])
	
	print('PLAY AUDIO CUE: combat { "targetColumn": %d.0 }' % target_col)
	
	for step in steps:
		var dmg: int = int(step.get("damage", 0))
		var bonuses: Array = step.get("bonuses", [])
		
		if dmg > 0:
			if str(step.get("target", "")) == "playerLp":
				print('PLAY AUDIO CUE: lp_damage { "amount": %d }' % dmg)
			else:
				print('PLAY AUDIO CUE: combat_hit { "damage": %d }' % dmg)
				
		for b in bonuses:
			print('PLAY AUDIO CUE: combat_bonus { "label": "%s" }' % str(b))
			
		# Yield time for visual impact (e.g., waiting for Tween or Timer)
		await get_tree().create_timer(0.3).timeout
		
	if total_lp_damage > 0:
		# Screen shake or similar could be triggered here
		pass
		
	await get_tree().create_timer(0.3).timeout

func _play_deploy_sequence(_details: Dictionary) -> void:
	await get_tree().create_timer(0.2).timeout
