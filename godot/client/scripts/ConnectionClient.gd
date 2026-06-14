class_name ConnectionClient
extends Node

var socket = WebSocketPeer.new()
var store: GameViewStore

func _init(game_view_store: GameViewStore):
	store = game_view_store

func connect_to_server(url: String):
	store.connection_state = GameViewStore.ConnectionState.CONNECTING
	var err = socket.connect_to_url(url)
	if err != OK:
		print("Unable to connect to server: ", err)
		store.connection_state = GameViewStore.ConnectionState.DISCONNECTED

func _process(_delta):
	socket.poll()
	var state = socket.get_ready_state()
	
	if state == WebSocketPeer.STATE_OPEN:
		if store.connection_state != GameViewStore.ConnectionState.OPEN:
			store.connection_state = GameViewStore.ConnectionState.OPEN
		
		while socket.get_available_packet_count():
			var packet = socket.get_packet()
			var data = ProtocolCodec.decode(packet.get_string_from_utf8())
			if data:
				print("Received: ", data)
	elif state == WebSocketPeer.STATE_CLOSED:
		if store.connection_state != GameViewStore.ConnectionState.DISCONNECTED:
			store.connection_state = GameViewStore.ConnectionState.DISCONNECTED

func send_message(data: Dictionary):
	var json_string = ProtocolCodec.encode(data)
	socket.send_text(json_string)
