const express = require("express");
const cors = require("cors");
const pendulums = require("./constants/pendulums");
const PendulumSimulation = require("./modules/simulation/simulation");

const createServer = (pendulum) => {
  const app = express();
  app.use(express.json());
  app.use(cors());
  const port = 3000 + pendulum.id;

  let simulation = null;

  app.get("/position", (req, res) => {
    res.status(200);
    return res.json({
      ...pendulum,
      bob: simulation.bob,
      angle: simulation.angle,
      pendulumLength: simulation.pendulumLength,
      origin: simulation.origin,
    });
  });

  app.post("/start", (req, res) => {
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
      origin
    );
    simulation.start();
    return res.sendStatus(200);
  });
  app.post("/pause", (req, res) => {});
  app.post("/reset", (req, res) => {});

  app.listen(port, () => {
    console.log(`Pendulum ${pendulum.id} listening on port ${port}`);
  });
};

pendulums.forEach(createServer);
