const env = require("../../env");
const mqtt = require("mqtt");

const createMqttClient = (pendulum) => {
  const clientId = `pendulum_mqtt_${pendulum.id}`;
  const client = mqtt.connect(env.MQTT_BROKER_URL, {
    clientId: clientId,
    clean: false,
    reconnectPeriod: 1,
    username: clientId,
    password: clientId,
  });

  client.on("connect", function (connack) {
    console.log("connected");
  });

  client.on("error", function (err) {
    console.log("Error: " + err);
    if (err.code == "ENOTFOUND") {
      console.log(
        "Network error, make sure you have an active internet connection"
      );
    }
  });

  client.on("close", function () {
    console.log("Connection closed by client");
  });

  client.on("reconnect", function () {
    console.log("Client trying a reconnection");
  });

  client.on("offline", function () {
    console.log("Client is currently offline");
  });

  return client;
};

module.exports = { createMqttClient };
