import { throttle, snakeCase } from "lodash";
import mqtt from "mqtt";
import { promises } from "fs";

import Api, { SendCommand, HubState, Switch } from "./api";

interface AppConfig {
  deviceId: string;
}

const CONF_DIR = process.env.CONF_DIR ?? "/config";

const initialize = async () => {
  let appConfig: AppConfig;

  try {
    const buffer = await promises.readFile(CONF_DIR + "/config.json");
    appConfig = JSON.parse(buffer.toString());
  } catch (error) {
    console.log("Could not read config.json file at path: %s, exiting", CONF_DIR);
    process.exit(1);
  }

  const client = mqtt.connect(process.env.MQTT_HOST, {
    username: process.env.MQTT_USER,
    password: process.env.MQTT_PASS,
    will: {
      topic: "caavo/availability",
      payload: "offline",
      qos: 1,
      retain: true,
    },
  });

  const api = new Api({
    deviceId: appConfig.deviceId,
  });

  // reference to any hubs found
  const hubsByName = new Map<string, Switch>();

  client.on("error", (error) => {
    console.error(error);
  });

  client.on("connect", async () => {
    console.info("Connected to home automation mqtt broker");

    client.publish("caavo/availability", "online", { qos: 1, retain: true });

    const hubs: Switch[] = (await api.findSwitches()) ?? [];
    if (hubs.length === 0) {
      console.error('Unable to find any Caavo switches')
      process.exit(1);
    }

    hubs.forEach((hub) => {
      console.info(`Subscribing to ${hub.friendlyName} hub as caavo/${hub.name}/+`);

      client.subscribe(`caavo/${hub.name}/update_state`);
      client.subscribe(`caavo/${hub.name}/command`, { qos: 2 });

      hubsByName.set(hub.name, hub);
    });
  });

  client.on("message", async (topic, message) => {
    const [, hubName] = topic.split("/");
    const hub = hubsByName.get(hubName);

    if (!hub) {
      console.info(`Unable to process topic: ${topic}, hub not recognized`);
      return;
    }

    switch (topic) {
      case `caavo/${hubName}/update_state`:
        return await fetchHubState({ switchId: hub.id });
      case `caavo/${hubName}/command`:
        const { action } = JSON.parse(message.toString());
        return await sendCommand({ action, switchId: hub.id });
    }

    console.warn("No handler for topic: %s", topic);
  });

  const fetchHubState = throttle(async ({ switchId }) => {
    console.info("Processing request to get hub state");

    const hubState = await api.getState({ switchId });

    hubState && notifyStateChange(hubState);
  }, 10000);

  /**
   * Queue requests send a command service call. May be overkill
   *
   * @param {{action: {string}}}} request
   */
  const sendCommand = async ({ action, switchId }: SendCommand) => {
    console.info(`Processing request to send command with action: ${action}`);

    try {
      await api.sendCommand({ action, switchId });
      setTimeout(() => fetchHubState({ switchId }), 5000);
      setTimeout(() => fetchHubState({ switchId }), 10000);
    } catch (error) {
      console.error(`Unable to perform command, action: ${action}, error: ${error}`);
    }
  };

  /**
   * Publish an MQTT message for the hub state
   *
   * @param {{switchId: {string}, switchName: {string}, powerState: {number}, updatedAt: {string}}} hubState
   */
  const notifyStateChange = (hubState: HubState) => {
    client.publish(`caavo/${snakeCase(hubState.switchName)}/state`, JSON.stringify({ ...hubState }), { retain: true });
  };
};

initialize();
