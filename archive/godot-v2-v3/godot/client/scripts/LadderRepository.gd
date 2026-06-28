class_name LadderRepository
extends Node

signal leaderboard_loaded(rankings)
signal player_stats_loaded(stats)
signal request_failed(error)

var base_url: String = "http://localhost:3001"

func fetch_leaderboard(category: String, limit: int = 50, offset: int = 0) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(func(result, response_code, headers, body):
		_on_request_completed(result, response_code, headers, body, leaderboard_loaded)
		http.queue_free()
	)
	
	var url := "%s/api/ladder/%s?limit=%d&offset=%d" % [base_url, category, limit, offset]
	var err = http.request(url)
	if err != OK:
		emit_signal("request_failed", "Failed to initiate ladder request")

func fetch_player_stats(userId: String, category: String) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(func(result, response_code, headers, body):
		_on_request_completed(result, response_code, headers, body, player_stats_loaded)
		http.queue_free()
	)
	
	var url := "%s/api/ladder/%s/%s" % [base_url, category, userId]
	var err = http.request(url)
	if err != OK:
		emit_signal("request_failed", "Failed to initiate player stats request")

func _on_request_completed(result, response_code, _headers, body, success_signal: Signal) -> void:
	if result != HTTPRequest.RESULT_SUCCESS:
		emit_signal("request_failed", "Network error: %d" % result)
		return
	
	if response_code < 200 or response_code >= 300:
		emit_signal("request_failed", "Server error: %d" % response_code)
		return
	
	var json = JSON.new()
	var err = json.parse(body.get_string_from_utf8())
	if err != OK:
		emit_signal("request_failed", "JSON parse error: %s" % json.get_error_message())
		return
	
	var data = json.get_data()
	if success_signal.get_name() == "leaderboard_loaded":
		emit_signal(success_signal.get_name(), data.get("rankings", []))
	else:
		emit_signal(success_signal.get_name(), data)
