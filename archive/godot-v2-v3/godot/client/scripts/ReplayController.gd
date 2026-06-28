class_name ReplayController
extends Node

var frames: Array = []
var current_frame_index: int = 0
var is_playing: bool = false
var speed: float = 1.0
var timer: Timer = Timer.new()

signal frame_changed(frame)
signal playback_finished()

func _init():
    timer.timeout.connect(_on_timer_timeout)
    add_child(timer)
    timer.wait_time = 1.0 / speed

func set_speed(new_speed: float):
    speed = maxf(0.1, new_speed)
    timer.wait_time = 1.0 / speed
    if is_playing:
        timer.start()

func load_frames(new_frames: Array):
    pause()
    frames = new_frames.duplicate(true)
    current_frame_index = 0
    if frames.size() > 0:
        emit_signal("frame_changed", frames[current_frame_index])
    else:
        emit_signal("playback_finished")

func play():
    if frames.size() > 1:
        is_playing = true
        timer.start()
    elif frames.size() == 1:
        is_playing = false
        emit_signal("frame_changed", frames[current_frame_index])
        emit_signal("playback_finished")

func pause():
    is_playing = false
    timer.stop()

func get_current_frame():
    if frames.size() == 0:
        return null
    return frames[current_frame_index]

func step(direction: int):
    if frames.size() > 0:
        current_frame_index = clamp(current_frame_index + direction, 0, frames.size() - 1)
        emit_signal("frame_changed", frames[current_frame_index])

func seek(frame_index: int):
    if frames.size() > 0:
        current_frame_index = clamp(frame_index, 0, frames.size() - 1)
        emit_signal("frame_changed", frames[current_frame_index])

func _on_timer_timeout():
    if is_playing:
        step(1)
        if current_frame_index == frames.size() - 1:
            pause()
            emit_signal("playback_finished")
