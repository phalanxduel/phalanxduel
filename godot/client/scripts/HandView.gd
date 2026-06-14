func submit_intent(card_id: String, target_col: int):
    var intent = {"type": "deploy", "cardId": card_id, "col": target_col}
    ConnectionClient.send_message(intent)
