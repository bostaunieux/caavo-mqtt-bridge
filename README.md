# caavo-mqtt-bridge

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
| MQTT_USER | Yes	   | Mqtt user        |
| MQTT_USER | Yes	   | Mqtt password    |
| CONF_DIR  | No	   | Optional directory where the config.json file is located. Defaults to '/config' |

## Docker tagging steps

1. Build tag
	```
	docker build -t bostaunieux/caavo-mqtt-bridge:latest .
	docker build -t bostaunieux/caavo-mqtt-bridge:1.1.6 .
	```
2. Publish tag
	```
	docker push bostaunieux/caavo-mqtt-bridge:latest
	docker push bostaunieux/caavo-mqtt-bridge:1.1.6
	```

> If there are issues with access, ensure you're logged in - `docker login`
