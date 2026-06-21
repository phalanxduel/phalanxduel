class_name NarrationProducer

static func format_card(card: Dictionary) -> String:
	var suit = str(card.get("suit", "spades"))
	var face = str(card.get("face", "?"))
	var suit_glyph = "?"
	match suit:
		"spades": suit_glyph = "♠"
		"hearts": suit_glyph = "♥"
		"diamonds": suit_glyph = "♦"
		"clubs": suit_glyph = "♣"
	return "%s%s" % [face, suit_glyph]

static func format_deploy(detail: Dictionary, state: Dictionary) -> Dictionary:
	var player_index = int(detail.get("playerIndex", 0))
	var grid_index = int(detail.get("gridIndex", 0))
	var columns = int(state.get("params", {}).get("columns", 4))
	
	var player_name = "System"
	var players: Array = state.get("players", [])
	if player_index >= 0 and player_index < players.size():
		var p_meta = players[player_index].get("player")
		if p_meta is Dictionary:
			player_name = str(p_meta.get("name", "P%d" % (player_index + 1)))
	
	var col = grid_index % columns
	
	# Look up the card on the battlefield
	var card_label = "card"
	var suit = "spades"
	if player_index >= 0 and player_index < players.size():
		var bf: Array = players[player_index].get("battlefield", [])
		if grid_index >= 0 and grid_index < bf.size():
			var cell = bf[grid_index]
			if cell is Dictionary and cell.has("card"):
				card_label = format_card(cell.card)
				suit = str(cell.card.get("suit", "spades"))
	
	var text = "%s deployed %s to column %d" % [player_name, card_label, col + 1]
	return {"text": text, "suit": suit}

static func format_attack_step_attack(step: Dictionary, attacker_card: Dictionary) -> Dictionary:
	var attacker_label = format_card(attacker_card)
	var attacker_suit = str(attacker_card.get("suit", "spades"))
	var target_label = "card"
	if step.has("card") and step.card is Dictionary:
		target_label = format_card(step.card)
	var dmg = int(step.get("damage", 0))
	return {"text": "%s → %s (%d)" % [attacker_label, target_label, dmg], "suit": attacker_suit}

static func format_attack_step_overflow(step: Dictionary, attacker_card: Dictionary) -> Dictionary:
	var target_label = "card"
	var target_suit = "spades"
	if step.has("card") and step.card is Dictionary:
		target_label = format_card(step.card)
		target_suit = str(step.card.get("suit", "spades"))
	var dmg = int(step.get("damage", 0))
	return {"text": "↪ %s (%d)" % [target_label, dmg], "suit": target_suit}

static func format_attack_step_destroyed(step: Dictionary) -> Dictionary:
	var target_label = "card"
	var target_suit = "spades"
	if step.has("card") and step.card is Dictionary:
		target_label = format_card(step.card)
		target_suit = str(step.card.get("suit", "spades"))
	return {"text": "DESTROYED %s" % target_label, "suit": target_suit}

static func format_attack_step_lp(step: Dictionary, state: Dictionary, attacker_card: Dictionary, attacker_idx: int) -> Dictionary:
	var defender_idx = 1 if attacker_idx == 0 else 0
	var player_name = "Opponent"
	var players: Array = state.get("players", [])
	if defender_idx >= 0 and defender_idx < players.size():
		var p_meta = players[defender_idx].get("player")
		if p_meta is Dictionary:
			player_name = str(p_meta.get("name", "P%d" % (defender_idx + 1)))
	var dmg = int(step.get("damage", 0))
	var suit = str(attacker_card.get("suit", "spades"))
	return {"text": "%d dmg → %s" % [dmg, player_name], "suit": suit}

static func get_bonus_message(bonus: String, card_label: String) -> String:
	match bonus:
		"aceInvulnerable": return "%s is invulnerable" % card_label
		"aceVsAce": return "%s breaks through invulnerability" % card_label
		"diamondDoubleDefense": return "...absorbed by Diamond Defense"
		"clubDoubleOverflow": return "...doubled by Club Overflow"
		"spadeDoubleLp": return "...doubled by Spade direct strike"
		"heartDeathShield": return "%s survives — Heart Shield" % card_label
		"diamondDeathShield": return "%s survives — Diamond Shield" % card_label
	return ""

static func format_reinforce(detail: Dictionary, state: Dictionary) -> Dictionary:
	var player_index = int(detail.get("playerIndex", 0))
	var column = int(detail.get("column", 0))
	var cards_drawn = int(detail.get("cardsDrawn", 0))

	var player_name = "System"
	var players: Array = state.get("players", [])
	if player_index >= 0 and player_index < players.size():
		var p_meta = players[player_index].get("player")
		if p_meta is Dictionary:
			player_name = str(p_meta.get("name", "P%d" % (player_index + 1)))

	var suit_color = "spades"
	var columns = int(state.get("params", {}).get("columns", 4))
	var grid_index = column
	if player_index >= 0 and player_index < players.size():
		var bf: Array = players[player_index].get("battlefield", [])
		if grid_index >= 0 and grid_index < bf.size():
			var cell = bf[grid_index]
			if cell is Dictionary and cell.has("card"):
				var card = cell.get("card", {})
				if card is Dictionary:
					suit_color = str(card.get("suit", "spades"))

	var text = "%s reinforced column %d and drew %d card%s" % [
		player_name,
		column + 1,
		cards_drawn,
		"s" if cards_drawn != 1 else ""
	]
	return {"text": text, "suit": suit_color}

static func is_suppressed(bonus: String) -> bool:
	return bonus == "faceCardIneligible"
