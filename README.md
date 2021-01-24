# caavo-mqtt-bridge

This project creates a service to connect a Caavo control center hub to an MQTT broker. Messages can be published on the broker to send commands to the Caavo hub. In response, the state of the hub will be read after a command is performed and published on a separate topic.

## Setup

Create a `config.json` file with the following format:

```
{
    "deviceId": "79A6FB83-2D23-43FD-ACC3-3A756D392CFC",
	"mqttHost": "mqtt://[username:password@]192.168.1.5
}
```

Then when define the following env vars

| Variable  | Required | Description      |
| ----------| -------- | -----------------
| CONF_DIR  | No	   | Optional directory where the config.json file is located. Defaults to '/config' |


## Running the service
1. Compile 
	```
	npm run build
	```
2. Start the service
	```
	npm start

	# with optional config dir
	CONF_DIR=/etc/caavo/ npm start
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
