class_name ProtocolValidator
extends RefCounted

const valid_intents = ["playCard", "attack", "endTurn"]

static func validate_intent(intent: Dictionary) -> bool:
	if not intent.has("type"):
		return false
	
	var type = intent.get("type")
	if not valid_intents.has(type):
		return false
		
	# Basic structural validation
	match type:
		"playCard":
			return intent.has("cardId") and intent.has("position")
		"attack":
			return intent.has("attackerId") and intent.has("targetId")
		"endTurn":
			return true
			
	return false
