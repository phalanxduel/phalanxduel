class_name ThemeManager
extends RefCounted

# Mirror of style.css variables
const BG = Color(0.0078, 0.0078, 0.0196) # --bg: #020205
const GOLD = Color(0.941, 0.753, 0.251)  # --gold: #f0c040
const GOLD_DIM = Color(0.604, 0.471, 0.157) # --gold-dim: #9a7828
const GOLD_BRIGHT = Color(1.0, 0.941, 0.627) # --gold-bright: #fff0a0
const NEON_BLUE = Color(0.0, 0.478, 1.0) # --neon-blue: #007aff
const LIGHT_BLUE = Color(0.55, 0.82, 1.0)
const NEON_RED = Color(1.0, 0.176, 0.333) # --neon-red: #ff2d55
const LIGHT_RED = Color(1.0, 0.49, 0.60)
const TEXT = Color(0.878, 0.878, 0.878)  # --text: #e0e0e0
const TEXT_DIM = Color(0.463, 0.463, 0.463) # --text-dim: #767676

# Suit Colors
const SPADE_COLOR = Color(0.38, 0.47, 0.64)
const HEART_COLOR = Color(0.68, 0.38, 0.42)
const DIAMOND_COLOR = Color(0.72, 0.58, 0.28)
const CLUB_COLOR = Color(0.34, 0.55, 0.42)

static func get_color(name: String) -> Color:
	match name:
		"bg": return BG
		"gold": return GOLD
		"gold_dim": return GOLD_DIM
		"gold_bright": return GOLD_BRIGHT
		"blue": return NEON_BLUE
		"light_blue": return LIGHT_BLUE
		"red": return NEON_RED
		"light_red": return LIGHT_RED
		"text": return TEXT
		"text_dim": return TEXT_DIM
		"spade", "spades": return SPADE_COLOR
		"heart", "hearts": return HEART_COLOR
		"diamond", "diamonds": return DIAMOND_COLOR
		"club", "clubs": return CLUB_COLOR
		_: return Color.WHITE
