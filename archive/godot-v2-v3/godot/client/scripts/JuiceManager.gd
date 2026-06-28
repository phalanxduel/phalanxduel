class_name JuiceManager
extends Node

var _target: Control
var _original_position: Vector2
var _shake_intensity: float = 0.0
var _shake_decay: float = 0.9
var _noise := FastNoiseLite.new()
var _noise_i: float = 0.0

func _init(target: Control) -> void:
	_target = target
	_original_position = target.position
	_noise.seed = randi()
	_noise.frequency = 0.5

func _process(delta: float) -> void:
	if _shake_intensity > 0.1:
		_noise_i += delta * 30.0
		var offset := Vector2(
			_noise.get_noise_2d(_noise_i, 0.0) * _shake_intensity,
			_noise.get_noise_2d(0.0, _noise_i) * _shake_intensity
		)
		_target.position = _original_position + offset
		_shake_intensity *= _shake_decay
	else:
		_shake_intensity = 0.0
		_target.position = _original_position

func shake(intensity: float = 10.0) -> void:
	_shake_intensity = intensity

func flash(color: Color = Color.WHITE, duration: float = 0.1) -> void:
	var f := ColorRect.new()
	f.color = color
	f.set_anchors_preset(Control.PRESET_FULL_RECT)
	f.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_target.add_child(f)
	
	var tween := _target.get_tree().create_tween()
	tween.tween_property(f, "modulate:a", 0.0, duration)
	tween.tween_callback(f.queue_free)

func spawn_particles(pos: Vector2, color: Color = Color(0.08, 0.48, 1.0)) -> void:
	var p := CPUParticles2D.new()
	p.position = pos
	p.emitting = true
	p.amount = 12
	p.one_shot = true
	p.explosiveness = 1.0
	p.spread = 180.0
	p.gravity = Vector2.ZERO
	p.initial_velocity_min = 50.0
	p.initial_velocity_max = 100.0
	p.scale_amount_min = 2.0
	p.scale_amount_max = 4.0
	p.color = color
	p.direction = Vector2.UP
	_target.add_child(p)
	
	var timer := _target.get_tree().create_timer(1.0)
	timer.timeout.connect(p.queue_free)

func vibrate(pattern) -> void:
	# Godot 4.x vibration support
	Input.vibrate_handheld(500)
