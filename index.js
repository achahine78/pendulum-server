const express = require("express");
const cors = require("cors");
const pendulums = require("./constants/pendulums");
const PendulumSimulation = require("./modules/simulation/simulation");
const { createMqttClient } = require("./modules/mqtt/mqtt");

const createServer = (pendulum) => {
  const app = express();
  app.use(express.json());
  app.use(cors());
  const port = 3000 + pendulum.id;

  let simulation = null;

  const mqttClient = createMqttClient(pendulum);

  app.post("/start", (req, res) => {
    if (!simulation) {
      const angle = Number(req.body.angle);
      const bob = req.body.bob;
      const pendulumLength = Number(req.body.pendulumLength);
      const origin = req.body.origin;

      simulation = new PendulumSimulation(
        pendulum.id,
        angle,
        0,
        0,
        bob,
        pendulumLength,
        origin,
        mqttClient
      );
      simulation.start();
      return res.sendStatus(200);
    }

    if (simulation.simulationState === SimulationStates.RUNNING) {
      return res.sendStatus(200);
    }

    if (simulation.simulationState === SimulationStates.STOPPED) {
      simulation.start();
      return res.sendStatus(200);
    }
  });

  app.get("/position", (req, res) => {
    if (!simulation) {
      return res.sendStatus(404);
    }

    res.status(200);
    return res.json({
      ...pendulum,
      bob: simulation.bob,
      angle: simulation.angle,
      pendulumLength: simulation.pendulumLength,
      origin: simulation.origin,
    });
  });

  app.post("/pause", (req, res) => {
    if (!simulation) {
      return res.sendStatus(200);
    }

    simulation.stop({ isCollision: false });
    return res.sendStatus(200);
  });

  app.post("/reset", (req, res) => {
    if (simulation) {
      simulation.stop({ isCollision: false });
      simulation = null;
    }

    return res.sendStatus(200);
  });

  app.listen(port, () => {
    console.log(`Pendulum ${pendulum.id} listening on port ${port}`);
  });
};

pendulums.forEach(createServer);
