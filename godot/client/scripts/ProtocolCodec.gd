class_name ProtocolCodec
extends RefCounted

static func encode(data: Dictionary) -> String:
	return JSON.stringify(data)

static func decode(json_string: String) -> Variant:
	var json = JSON.new()
	var error = json.parse(json_string)
	if error != OK:
		print("JSON Parse Error: ", json.get_error_message(), " at ", json.get_error_line())
		return null
	return json.get_data()
