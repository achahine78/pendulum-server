const express = require("express");
const cors = require("cors");
const pendulums = require("./constants/pendulums");
const PendulumSimulation = require("./modules/simulation/simulation");
const { createMqttClient } = require("./modules/mqtt/mqtt");
const { SimulationStates } = require("./constants/simulation");
const { 
  v1: uuidv1,
  v4: uuidv4,
} = require('uuid');

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
        uuidv4(),
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
      res.status(200);
      return res.json({
        message: `Simulation for pendulum ${pendulum.id} has started`,
      });
    }

    if (simulation.simulationState === SimulationStates.RESTARTING) {
      res.status(200);
      return res.json({
        message: `Simulation for pendulum ${pendulum.id} is restarting due to collision`,
      });
    }

    if (simulation.simulationState === SimulationStates.RUNNING) {
      res.status(200);
      return res.json({
        message: `Simulation for pendulum ${pendulum.id} is already running`,
      });
    }

    if (simulation.simulationState === SimulationStates.STOPPED) {
      simulation.start();
      res.status(200);
      return res.json({
        message: `Simulation for pendulum ${pendulum.id} has started`,
      });
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
      res.status(200);
      return res.json({
        message: `No simulation for pendulum ${pendulum.id} is running.`,
      });
    }

    if (simulation.simulationState === SimulationStates.STOPPED) {
      res.status(200);
      return res.json({
        message: `Simulation for pendulum ${pendulum.id} is already paused.`,
      });
    }

    if (simulation.simulationState === SimulationStates.RESTARTING) {
      res.status(200);
      return res.json({
        message: `Simulation for pendulum ${pendulum.id} is restarting due to collision`,
      });
    }

    simulation.stop({ isCollision: false });
    res.status(200);
    return res.json({
      message: `Simulation for pendulum ${pendulum.id} has been paused.`,
    });
  });

  app.post("/reset", (req, res) => {
    if (simulation) {
      // simulation.stop({ isCollision: false });
      simulation.reset();
      simulation = null;
    }

    return res.sendStatus(200);
  });

  app.listen(port, () => {
    console.log(`Pendulum ${pendulum.id} listening on port ${port}`);
  });
};

pendulums.forEach(createServer);
