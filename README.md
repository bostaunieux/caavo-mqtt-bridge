# caavo-mqtt-bridge

## Setup

Create the `/config/config.json` file with the following format:

```
{
    "deviceId": "79A6FB83-2D23-43FD-ACC3-3A756D392CFC",
    "switches": {
        "family_room": "39871956563f4d2ab6616ffc62e0b0ca"
    }
}
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
