extends Node

var socket = WebSocketPeer.new()
var url = "wss://echo.websocket.org"

func _ready():
	print("Connecting to: ", url)
	var error = socket.connect_to_url(url)
	if error != OK:
		print("Unable to connect")
	else:
		print("Connecting...")

func _process(_delta):
	socket.poll()
	var state = socket.get_ready_state()
	if state == WebSocketPeer.STATE_OPEN:
		while socket.get_available_packet_count():
			var packet = socket.get_packet()
			var text = packet.get_string_from_utf8()
			print("Received: ", text)
			var json = JSON.parse_string(text)
			if json:
				print("Parsed JSON: ", json)
			else:
				print("Failed to parse JSON")
