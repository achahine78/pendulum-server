const {
  SimulationStates,
  GRAVITY_CONSTANT,
  DISTANCE_THRESHOLD,
} = require("../../constants/simulation");

class PendulumSimulation {
  id;
  angle;
  angularVelocity = 0;
  angularAcceleration = 0;
  bob;
  pendulumLength;
  origin;
  interval;

  initialConditions;

  simulationState;

  constructor(
    id,
    angle,
    angularVelocity = 0,
    angularAcceleration = 0,
    bob,
    pendulumLength,
    origin
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
  }

  simulationStep = async () => {
    let force = GRAVITY_CONSTANT * Math.sin(this.angle);
    this.angularAcceleration = (-1 * force) / this.pendulumLength;
    this.angularVelocity += this.angularAcceleration;
    this.angle += this.angularVelocity;

    this.bob.x = this.pendulumLength * Math.sin(this.angle) + this.origin.x;
    this.bob.y = this.pendulumLength * Math.cos(this.angle) + this.origin.y;
  };

  start() {
    this.simulationState = SimulationStates.RUNNING;
    clearInterval(this.interval);
    this.interval = setInterval(this.simulationStep, 100);
  }
}

module.exports = PendulumSimulation;
