class_name AuthRepository
extends Node

signal login_success(token: String, user: Dictionary)
signal login_failed(error: String)
signal logout_success()
signal session_restored(token: String, user: Dictionary)
signal session_restore_failed()

var base_url: String = "http://localhost:3001"
var current_token: String = ""
var current_user: Dictionary = {}

func login(email: String, password: String) -> void:
	var http := HTTPRequest.new()
	add_child(http)
	http.request_completed.connect(func(result, response_code, headers, body):
		_on_login_completed(result, response_code, headers, body)
		http.queue_free()
	)
	
	var headers = ["Content-Type: application/json"]
	var body = JSON.stringify({"email": email, "password": password})
	var err = http.request(base_url + "/api/auth/login", headers, HTTPClient.METHOD_POST, body)
	if err != OK:
		emit_signal("login_failed", "Failed to initiate login request")

func _on_login_completed(result, response_code, _headers, body) -> void:
	if result != HTTPRequest.RESULT_SUCCESS:
		emit_signal("login_failed", "Network error: %d" % result)
		return
	
	var json = JSON.new()
	var err = json.parse(body.get_string_from_utf8())
	if err != OK:
		emit_signal("login_failed", "JSON parse error: %s" % json.get_error_message())
		return
		
	var data = json.get_data()
	if response_code < 200 or response_code >= 300:
		var err_msg = data.get("error", "Server error: %d" % response_code) if data is Dictionary else "Server error"
		emit_signal("login_failed", err_msg)
		return
		
	if data is Dictionary and data.has("token") and data.has("user"):
		current_token = data.get("token", "")
		current_user = data.get("user", {})
		emit_signal("login_success", current_token, current_user)
	else:
		emit_signal("login_failed", "Invalid response format")

func set_token(token: String) -> void:
	current_token = token

func get_token() -> String:
	return current_token

func is_authenticated() -> bool:
	return current_token != ""

func clear_session() -> void:
	current_token = ""
	current_user = {}
