# caavo-mqtt-bridge

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
