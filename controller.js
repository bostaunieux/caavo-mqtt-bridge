import throttle from 'lodash/throttle';
import kebabCase from 'lodash/kebabCase';
import mqtt from 'mqtt';

import Api from './api.js';
import appConfig from '/config/config.json';

const client = mqtt.connect(process.env.MQTT_HOST, {
  username: process.env.MQTT_USER, 
  password: process.env.MQTT_PASS,
  will: {
    topic: 'caavo/availability',
    payload: 'offline',
    qos: 1,
    retain: true
  }
});

const api = new Api({
  deviceId: appConfig.deviceId,
});

client.on('error', (error) => {
  console.error(error);
});

client.on('connect', () => {
  console.info('Connected to home automation mqtt broker');

  client.publish('caavo/availability', 'online', {qos: 1, retain: true});

  client.subscribe('caavo/living-room/update-state');
  client.subscribe('caavo/living-room/command/*', {qos: 2});
});

client.on('message', async (topic, message) => {

  switch (topic) {
    case 'caavo/living-room/update-state':
      return await fetchHubState();
    case 'caavo/living-room/command':
      const command = JSON.parse(+(message.toString()));
      return await sendCommand(command);
  }

  console.warn('No handler for topic: %s', topic);
});

const fetchHubState = throttle(async () => {
  console.info('Processing request to get hub state');

  const hubState = await api.getState();
  
  hubState && notifyStateChange(hubState);
}, 10000);

/**
 * Queue requests send a command service call. May be overkill
 * 
 * @param {{action: {string}}}} request 
 */
const sendCommand = async ({action}) => {
  console.info('Processing request to send command');

  const response = await api.sendCommand({action});

  response && notifyStateChange(response);
};

/**
 * Publish an MQTT message for the hub state
 * 
 * @param {{switchId: {string}, switchName: {string}, powerState: {number}, updatedAt: {string}}} hubState
 */
const notifyStateChange = (hubState) => {
  
  client.publish(`caavo/${kebabCase(hubState.switchName)}/state`, JSON.stringify({...hubState}), {retain: true});
};