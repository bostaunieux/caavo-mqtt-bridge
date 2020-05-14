const throttle = require('lodash/throttle');
const snakeCase = require('lodash/snakeCase');
const mqtt = require('mqtt');

const Api = require('./api');
const appConfig = require('/config/config.json');

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

  client.subscribe('caavo/living_room/update_state');
  client.subscribe('caavo/living_room/command/*', {qos: 2});
});

client.on('message', async (topic, message) => {

  switch (topic) {
    case 'caavo/living_room/update_state':
      return await fetchHubState({switchId: appConfig.switches['living_room']});
    case 'caavo/living_room/command':
      const command = JSON.parse(+(message.toString()));
      return await sendCommand(command);
  }

  console.warn('No handler for topic: %s', topic);
});

const fetchHubState = throttle(async ({switchId}) => {
  console.info('Processing request to get hub state');

  const hubState = await api.getState({switchId});
  
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
  
  client.publish(`caavo/${snakeCase(hubState.switchName)}/state`, JSON.stringify({...hubState}), {retain: true});
};