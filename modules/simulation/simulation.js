const {
  SimulationStates,
  GRAVITY_CONSTANT,
  DISTANCE_THRESHOLD,
} = require("../../constants/simulation");

const { getDistance } = require("../../utils/getDistance");

const pendulums = require("../../constants/pendulums");
const axios = require("axios");

class PendulumSimulation {
  uuid;
  id;
  angle;
  angularVelocity = 0;
  angularAcceleration = 0;
  bob;
  pendulumLength;
  origin;
  mqttClient;

  interval;
  restartTimeout;

  initialConditions;

  simulationState;

  constructor(
    uuid,
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

    this.uuid = uuid;

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

    this.sendMessageAcrossMqttChannel("/vention/pendulums", null);

    this.mqttClient.on("message", (topic, payload) => {
      const stringifiedPayload = payload.toString();
      const parsedPayload = JSON.parse(stringifiedPayload);

      if (!parsedPayload) return;

      const { senderId, message, sentFrom } = parsedPayload;
      if (message === "stop") {
        if (this.simulationState === SimulationStates.RUNNING) {
          this.stop({ isCollision: true });
        }
      }

      if (message === "restart") {
        console.log(`receiving restart from ${senderId} at ${sentFrom}`)
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
        console.log(`${this.id} at ${this.interval} sending stop`)
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
      // this.reset();
    }
  };

  start() {
    this.simulationState = SimulationStates.RUNNING;
    clearInterval(this.interval);
    clearTimeout(this.restartTimeout);
    this.interval = setInterval(this.simulationStep, 100);
    console.log(`Pendulum ${this.id} setting interval ${this.interval}`);
  }

  stop({ isCollision }) {
    clearInterval(this.interval);
    clearTimeout(this.restartTimeout);
    this.simulationState = SimulationStates.STOPPED;
    if (isCollision) {
      this.simulationState = SimulationStates.RESTARTING;
      this.restartTimeout = setTimeout(() => {
        this.sendMessageAcrossMqttChannel("/vention/pendulums", {
          senderId: this.id,
          message: "restart",
          sentFrom: `interval: ${this.interval}`
        });
      }, 5000);
    }
  }

  restart() {
    this.angle = this.initialConditions.angle;
    this.angularVelocity = this.initialConditions.angularVelocity;
    this.angularAcceleration = this.initialConditions.angularAcceleration;
    this.bob = { ...this.initialConditions.bob };
    this.pendulumLength = this.initialConditions.pendulumLength;
    this.origin = this.initialConditions.origin;

    this.restartCount = 0;

    clearInterval(this.interval);
    clearTimeout(this.restartTimeout);
    console.log(`${this.id} calling start from restart`)
    this.start();
  }

  sendMessageAcrossMqttChannel(topic, payload) {
    this.mqttClient.publish(
      topic,
      JSON.stringify(payload),
      { qos: 0, retain: true },
      (PacketCallback, err) => {
        if (err) {
          console.log(err, "MQTT publish packet");
        }
      }
    );
  }

  reset() {
    console.log(`Pendulum ${this.id} clearing interval ${this.interval}`);
    clearInterval(this.interval);
    clearTimeout(this.restartTimeout);
    this.resetCount = 0;
    // this.mqttClient.end(true);
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
