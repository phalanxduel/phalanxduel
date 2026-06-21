class_name SpectatorHud
extends Control

const GameViewStoreScript = preload("res://scripts/GameViewStore.gd")

var store
var _root: VBoxContainer
var _summary_label: Label
var _connection_label: Label
var _checkpoint_label: Label
var _details_label: Label
var _log_container: VBoxContainer
var _last_checkpoint_sequence: int = -1
var _store_bound: bool = false

func bind_store(game_view_store) -> void:
	store = game_view_store
	if is_node_ready():
		_attach_store()
		refresh()

func _ready():
	size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	size_flags_vertical = Control.SIZE_EXPAND_FILL
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	_build_ui()
	_attach_store()
	refresh()

func _build_ui() -> void:
	var background := ColorRect.new()
	background.color = Color(0.006, 0.007, 0.011)
	background.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(background)

	_root = VBoxContainer.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_root.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_root.add_theme_constant_override("separation", 8)
	add_child(_root)

	var title := Label.new()
	title.text = "BATTLE LOG"
	title.add_theme_font_size_override("font_size", 18)
	title.add_theme_color_override("font_color", Color(0.69, 0.53, 0.12))
	_root.add_child(title)

	_connection_label = Label.new()
	_connection_label.text = "SYSTEM: disconnected"
	_connection_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_connection_label.clip_text = true
	_root.add_child(_connection_label)

	_summary_label = Label.new()
	_summary_label.text = "Match: waiting"
	_summary_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_summary_label.clip_text = true
	_root.add_child(_summary_label)

	_checkpoint_label = Label.new()
	_checkpoint_label.text = "CHECKPOINT initial"
	_checkpoint_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_checkpoint_label.clip_text = true
	_root.add_child(_checkpoint_label)

	_details_label = Label.new()
	_details_label.text = "Details: idle"
	_details_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_details_label.clip_text = true
	_root.add_child(_details_label)

	var log_title := Label.new()
	log_title.text = "PLAY_BY_PLAY"
	log_title.add_theme_font_size_override("font_size", 16)
	log_title.add_theme_color_override("font_color", Color(0.69, 0.53, 0.12))
	_root.add_child(log_title)

	_log_container = VBoxContainer.new()
	_log_container.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_log_container.add_theme_constant_override("separation", 4)
	_root.add_child(_log_container)

func _attach_store() -> void:
	if store == null or _store_bound:
		return
	store.connection_state_changed.connect(_on_store_changed)
	store.game_view_state_changed.connect(_on_store_changed)
	store.automation_checkpoint_changed.connect(_on_store_changed)
	_store_bound = true

func _on_store_changed(_value) -> void:
	refresh()

func refresh() -> void:
	if store == null:
		return

	_connection_label.text = "SYSTEM: %s" % _connection_state_label(store.connection_state)
	_checkpoint_label.text = "CHECKPOINT: %s" % store.automation_checkpoint

	var state: Dictionary = store.game_view_state
	if state.is_empty():
		_summary_label.text = "Match: waiting for state"
		_details_label.text = "Details: none"
	else:
		var match_id: String = str(state.get("matchId", ""))
		var phase: String = str(state.get("phase", ""))
		var turn_number: int = int(state.get("turnNumber", 0))
		var active_player: int = int(state.get("activePlayerIndex", 0))
		var viewer_index: Variant = state.get("viewerIndex", null)
		var spectator_count: int = int(state.get("spectatorCount", 0))
		var players: Array = state.get("players", [])
		var outcome: Variant = state.get("outcome", null)
		_summary_label.text = "MATCH %s\nPHASE %s\nTURN %d" % [
			_short_id(match_id),
			_phase_label(phase),
			turn_number,
		]
		_details_label.text = "ACTIVE P%d\nVIEWER %s\nWATCHING %d\nPLAYERS %d%s" % [
			active_player + 1,
			_viewer_text(viewer_index),
			spectator_count,
			players.size(),
			"\nOVER" if outcome is Dictionary else "",
		]

	pass

func add_narration_line(text: String, suit_color: String) -> void:
	var row := Label.new()
	row.text = text
	row.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	
	var ThemeManager = preload("res://scripts/ThemeManager.gd")
	var color = ThemeManager.get_color("text")
	match suit_color:
		"spades", "clubs": color = ThemeManager.get_color("blue")
		"hearts", "diamonds": color = ThemeManager.get_color("red")
		"default": color = ThemeManager.get_color("text")
		
	row.add_theme_color_override("font_color", color)
	_log_container.add_child(row)
	
	if _log_container.get_child_count() > 30:
		var c = _log_container.get_child(0)
		_log_container.remove_child(c)
		c.queue_free()
	pass

func _connection_state_label(value: int) -> String:
	match value:
		GameViewStoreScript.ConnectionState.CONNECTING:
			return "connecting"
		GameViewStoreScript.ConnectionState.OPEN:
			return "open"
		_:
			return "disconnected"

func _viewer_text(value: Variant) -> String:
	if value == null:
		return "spectator"
	return "P%d" % (int(value) + 1)

func _short_id(value: String) -> String:
	if value.length() <= 12:
		return value
	return "%s...%s" % [value.substr(0, 8), value.substr(value.length() - 4, 4)]

func _phase_label(value: String) -> String:
	match value:
		"DeploymentPhase":
			return "DEPLOYMENT"
		"AttackPhase":
			return "COMBAT"
		"gameOver":
			return "GAME_OVER"
		_:
			return value.to_upper()
