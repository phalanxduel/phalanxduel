class_name MatchRepository
extends Node

signal lobby_matches_loaded(matches)
signal active_matches_loaded(matches)
signal request_failed(error)

var base_url: String = "http://localhost:3001"

func fetch_lobby_matches() -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(func(result, response_code, headers, body):
		_on_request_completed(result, response_code, headers, body, lobby_matches_loaded)
		http.queue_free()
	)
	
	var err = http.request(base_url + "/api/matches/lobby?includeRecentlyExpired=true")
	if err != OK:
		emit_signal("request_failed", "Failed to initiate lobby matches request")

func fetch_active_matches() -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(func(result, response_code, headers, body):
		_on_request_completed(result, response_code, headers, body, active_matches_loaded)
		http.queue_free()
	)
	
	var headers = []
	var store = get_node_or_null("/root/Main/GameViewStore")
	var env_token = OS.get_environment("PHALANX_TOKEN")
	if env_token != "":
		headers.append("Authorization: Bearer " + env_token)
	elif store and store.has_method("get_auth_token") and store.get_auth_token() != "":
		headers.append("Authorization: Bearer " + store.get_auth_token())
		
	var err = http.request(base_url + "/api/matches/active", headers)
	if err != OK:
		emit_signal("request_failed", "Failed to initiate active matches request")

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
	var matches: Array = []
	if data is Array:
		matches = data
	elif data is Dictionary and data.has("matches"):
		matches = data.get("matches", [])
	
	emit_signal(success_signal.get_name(), matches)
