const express = require("express");
const cors = require("cors");

const app = express();
app.use(express.json());
app.use(cors());

const port = 3000;

app.get("/position", (req, res) => {});

app.post("/start", (req, res) => {});
app.post("/pause", (req, res) => {});
app.post("/reset", (req, res) => {});

app.listen(port, () => {
  console.log(`Pendulum listening on port ${port}`);
});
