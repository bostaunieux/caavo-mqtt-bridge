# caavo-mqtt-bridge

This project creates a service to connect a Caavo control center hub to an MQTT broker. Messages can be published on the broker to send commands to the Caavo hub. In response, the state of the hub will be read after a command is performed and published on a separate topic.

## Setup

Create a `config.json` file with the following format:

```
{
    "username": "my-username",
    "password": "my-password",
    "mqttHost": "mqtt://[username:password@]192.168.1.5,
    "deviceIdSeed": "a valid uuid"
}
```

Note `deviceIdSeed` may be omitted, but if set, it must be a valid UUID. If it isn't, a default UUID will be used.

Then when define the following env vars

| Variable  | Required | Description      |
| ----------| -------- | -----------------
| CONF_DIR  | No	   | Optional directory where the config.json file is located. Defaults to '/config' |


## Mqtt integration

This service will listen to messages published from the hub. See the output for specific hubs that get registered. Note hub names will be lowercased, with all spaces replaced with underscores.

Topics to be published include:

### `caavo/{hub_name}/state`

Current state of the caavo device. Note any changes made outside this MQTT service won't automatically be picked up. See the `update_state` topic for manually triggering an update.

Topic payload format:
```
{
	"switchId": "string", // unique identifier for the switch
	"switchName": "string", // display friendly name for the switch
	"powerState": "ON | "OFF", // power status
	"updatedAt": "string" // timestamp of the last update
}
```

### `caavo/{hub_name}/update_state`

Trigger an update to the provided hub's state


### `caavo/{hub_name}/command`

Send the provided command to the caavo hub

Topic payload format:
```
{
	"action": "action_key"
}
```
Available actions includes:

| Action Key | Description                      |
| -----------| ---------------------------------
| vol_up     | Incease volume                   |
| vol_down   | Decrease volume                  |
| mute       | Mute sound                       |
| play       | Play button                      |
| back       | Go back button                   |
| home       | Home button                      |
| forward    | Forward button                   |
| rewind     | Rewind button                    |
| dir_up     | Direction up button              |
| dir_down   | Direction down button            |
| dir_left   | Direction left / previous button |
| dir_right  | Direction right / next button    |
| select     | Select button                    |
| power_on   | Power on*                        |
| power_off  | Power off                        |

> \* Power on toggles the power. If the device is on, it will bring up the intermediate power off screen.


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
	
	docker run bostaunieux/caavo-mqtt-bridge:latest
	```
2. Run tag
	```
	docker run -v '/local/path/to/config':'/config':'ro'  bostaunieux/caavo-mqtt-bridge:latest
	```	
3. Optionally publish tag
	```
	docker push bostaunieux/caavo-mqtt-bridge:latest
	docker push bostaunieux/caavo-mqtt-bridge:1.1.6
	```

> If there are issues with access, ensure you're logged in - `docker login`
