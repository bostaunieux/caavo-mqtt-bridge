# caavo-mqtt-bridge

This project creates a service to connect a Caavo control center hub to an MQTT broker. Messages can be published on the broker to send commands to the Caavo hub. In response, the state of the hub will be read after a command is performed and published on a separate topic.

## Setup

Create the `/config/config.json` file with the following format:

```
{
    "deviceId": "79A6FB83-2D23-43FD-ACC3-3A756D392CFC"
}
```

Then when define the following env vars

| Variable  | Required | Description      |
| ----------| -------- | ----------------
| MQTT_HOST | Yes      | Mqtt broker host |
| MQTT_USER | Yes      | Mqtt user        |
| MQTT_USER | Yes      | Mqtt password    |
| CONF_DIR  | No       | Optional directory where the config.json file is located. Defaults to '/config' |

Start the service with
```
node controller.js
```

## Testing docker locally

1. Build tag
	```
	docker build -t bostaunieux/caavo-mqtt-bridge:latest .
	docker build -t bostaunieux/caavo-mqtt-bridge:1.1.6 .
	
	docker run bostaunieux/caavo-mqtt-bridge:latest
	```
3. Optionally publish tag
	```
	docker push bostaunieux/caavo-mqtt-bridge:latest
	docker push bostaunieux/caavo-mqtt-bridge:1.1.6
	```

> If there are issues with access, ensure you're logged in - `docker login`
