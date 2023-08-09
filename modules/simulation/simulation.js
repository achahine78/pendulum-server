const {
  SimulationStates,
  GRAVITY_CONSTANT,
  DISTANCE_THRESHOLD,
} = require("../../constants/simulation");

const { getDistance } = require('../../utils/getDistance');

const pendulums = require("../../constants/pendulums");
const axios = require("axios");

class PendulumSimulation {
  id;
  angle;
  angularVelocity = 0;
  angularAcceleration = 0;
  bob;
  pendulumLength;
  origin;
  mqttClient;

  interval;
  timeout;

  initialConditions;

  simulationState;

  constructor(
    id,
    angle,
    angularVelocity = 0,
    angularAcceleration = 0,
    bob,
    pendulumLength,
    origin,
    mqttClient
  ) {
    this.id = id;
    this.angle = angle;
    this.angularVelocity = angularVelocity;
    this.angularAcceleration = angularAcceleration;
    this.bob = bob;
    this.pendulumLength = pendulumLength;
    this.origin = origin;

    this.restartCount = 0;

    this.initialConditions = {
      id,
      angle: angle,
      bob: { ...bob },
      angularVelocity,
      angularAcceleration,
      pendulumLength,
      origin,
    };

    this.mqttClient = mqttClient;

    this.mqttClient.on("message", (topic, payload) => {
      const stringifiedPayload = payload.toString();
      const parsedPayload = JSON.parse(stringifiedPayload);
      const { message } = parsedPayload;
      if (message === "stop") {
        if (this.simulationState === SimulationStates.RUNNING) {
          this.stop({ isCollision: true });
        }
      }

      if (message === "restart") {
        if (this.simulationState.RUNNING) return;
        this.restartCount++;
        if (this.restartCount === 5) {
          this.restart();
        }
      }
    });
  }

  simulationStep = async () => {
    try {
      const pendulumPositions = await this.getPendulumPositions();
      const pendulumDistances = pendulumPositions.map((pos) =>
        getDistance(this.bob, pos.bob)
      );
      const doesCollisionExist = pendulumDistances.some(
        (distance) => distance < DISTANCE_THRESHOLD
      );
  
      if (doesCollisionExist) {
        this.sendMessageAcrossMqttChannel("/vention/pendulums", {
          senderId: this.id,
          message: "stop",
        });
      } else {
        let force = GRAVITY_CONSTANT * Math.sin(this.angle);
        this.angularAcceleration = (-1 * force) / this.pendulumLength;
        this.angularVelocity += this.angularAcceleration;
        this.angle += this.angularVelocity;
  
        this.bob.x = this.pendulumLength * Math.sin(this.angle) + this.origin.x;
        this.bob.y = this.pendulumLength * Math.cos(this.angle) + this.origin.y;
      }
    } catch (e) {
      // console.log(e)
    }
  };

  start() {
    this.simulationState = SimulationStates.RUNNING;
    this.clearIntervalAndTimeout();
    this.interval = setInterval(this.simulationStep, 100);
  }

  stop({ isCollision }) {
    this.clearIntervalAndTimeout();
    this.simulationState = SimulationStates.STOPPED;
    if (isCollision) {
      this.simulationState = SimulationStates.RESTARTING;
      this.timeout = setTimeout(() => {
        this.sendMessageAcrossMqttChannel("/vention/pendulums", {
          senderId: this.id,
          message: "restart",
        });
      }, 5000);
    }
  }

  restart() {
    this.clearIntervalAndTimeout();
    this.angle = this.initialConditions.angle;
    this.angularVelocity = this.initialConditions.angularVelocity;
    this.angularAcceleration = this.initialConditions.angularAcceleration;
    this.bob = { ...this.initialConditions.bob };
    this.pendulumLength = this.initialConditions.pendulumLength;
    this.origin = this.initialConditions.origin;

    this.restartCount = 0;

    this.start();
  }

  sendMessageAcrossMqttChannel(topic, payload) {
    this.mqttClient.publish(
      topic,
      JSON.stringify(payload),
      { qos: 1, retain: true },
      (PacketCallback, err) => {
        if (err) {
          console.log(err, "MQTT publish packet");
        }
      }
    );
  }

  clearIntervalAndTimeout () {
    clearInterval(this.interval);
    clearTimeout(this.timeout);
  }

  async getPendulumPositions() {
    const promises = pendulums.map((pendulum) =>
      axios.get(`http://localhost:300${pendulum.id}/position`)
    );
    const responses = await Promise.all(promises);
    const pendulumPositions = responses.map((response) => response.data);
    return pendulumPositions.filter((pos) => pos.id !== this.id);
  }
}

module.exports = PendulumSimulation;
