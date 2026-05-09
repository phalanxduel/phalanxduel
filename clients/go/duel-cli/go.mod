module github.com/phalanxduel/phalanxduel/clients/go/duel-cli

go 1.24.0

require github.com/phalanxduel/phalanxduel/sdk/go v0.0.0

require github.com/gorilla/websocket v1.5.3

require gopkg.in/validator.v2 v2.0.1 // indirect

replace github.com/phalanxduel/phalanxduel/sdk/go => ../../../sdk/go
