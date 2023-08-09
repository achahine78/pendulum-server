# pendulum-server
Server for running simulations for simple pendulums

# Setup Instructions
To run this node.js app, you need to create an env.js file in the root directory containing your MQTT broker credentials and run node index.

# API Documentation

## Start

**URL** : `/start`
**Method** : `POST`
**Body**: 
```json
{
  angle: 0,
  bob:{x: 0, y: 200},
  color: "red",
  id: 0,
  origin: {x: 0, y: 0},
  pendulumLength: 200
}
```

**URL** : `/position`
**Method** : `GET`
returns current position of pendulum

**URL** : `/pause`
**Method** : `POST`
pauses the pendulum simulation

**URL** : `/reset`
**Method** : `POST`
kills the pendulum simulation