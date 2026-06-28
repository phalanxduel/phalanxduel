extends Control

## Deployment Phase — 4-column × 2-row grid placement

@onready var grid: GridContainer = $VBoxContainer/Grid
@onready var deploy_btn: Button = $VBoxContainer/DeployButton

func _ready() -> void:
	print("[DeploymentScene] Ready")
	if deploy_btn:
		deploy_btn.pressed.connect(_on_deploy_complete)

func _on_deploy_complete() -> void:
	print("[DeploymentScene] Deployment complete")
	get_node("/root/MatchRoot/GameStateMachine").transition_to("AttackPhase")
