class_name ProtocolValidator
extends RefCounted

const valid_intents = ["deploy", "attack", "pass", "reinforce", "forfeit"]

static func validate_intent(intent: Dictionary) -> bool:
	if not intent.has("type"):
		return false
	
	var type = str(intent.get("type", ""))
	if not valid_intents.has(type):
		return false
		
	# Basic structural validation
	match type:
		"deploy":
			return intent.has("cardId") and intent.has("column") and intent.has("playerIndex")
		"attack":
			return intent.has("attackingColumn") and intent.has("defendingColumn") and intent.has("playerIndex")
		"reinforce":
			return intent.has("cardId") and intent.has("playerIndex")
		"pass", "forfeit":
			return intent.has("playerIndex")
			
	return false
