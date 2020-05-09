import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export default class Api {

    constructor({deviceId}) {
        this.deviceId = deviceId;

        this.accessToken = null;

        this.actionMap = {
            'vol_up': 'IncreaseVolume',
            'vol_down': 'DecreaseVolume',
            'play': 'Play',
            'mute': 'Mute',
            'back': 'GoBack',
            'home': 'DeviceHome',
            'forward': 'Forward',
            'rewind': 'Rewind',
            'dir_up': 'Up',
            'dir_down': 'Down',
            'dir_left': 'Previous',
            'dir_right': 'Next',
            'select': 'Select',
            'power_on': 'Power',
            'power_off': 'Power'
        };
    }

    async getState({switchId}) {
        try {
            const token = await this.getToken();
            return await this.requestStatus({token, switchId});
        } catch (error) {
            console.error('Failed fetching state', error);
            return null;
        }
    }

    async sendCommand({action, switchId}) {
        try {
            const token = await this.getToken();
            const normalizedAction = this.actionMap[action];
            const longPress = action === 'PowerOff';

            if (!normalizedAction) {
                throw new Error(`Unrecognized action: ${action}`);
            }

            return await this.requestSendCommand({token, switchId, action: normalizedAction, longPress});
        } catch (error) {
            console.error('Failed sending command', error);
            return null;
        }
    }

    async getToken() {
        const now = new Date().getTime();
    
        if (this.accessToken) {
            console.info('Found existing token; using');
            return this.accessToken;
        }
    
        console.info('No valid stored token found; fetching new token');
    
        try {
            const accessToken = await this.register();
    
            console.info('Received new token');
    
            // store the newly fetched token
            this.accessToken = accessToken;

            return accessToken;
        } catch (error) {
            throw new Error('Unable to fetch new token', error.message);
        }
    }

    async register() {
        const headers = {
            'User-Agent': 'Caavo Olive v11.3',
            'Content-Type': 'application/json'
        };
        const requestConfig = {headers};
    
        const response = await axios.post('https://api.caavo.com/clients/register', {
            'version': '2.3',
            'new_launch': true,
            'client_type': 'ios',
            'device_id': this.deviceId
        }, requestConfig);
    
        if (!response || !response.data || !response.data.access_token) {
            throw new Error('Invalid token api response; received message', response);
        }
    
        return response.data.access_token;
    }

    /**
     * 
     * @param {string} token - Auth token
     * @param {string} switchId - Switch id
     * @return {{switchId: {string}, switchName: {string}, powerState: {number}, updatedAt: {string}}}
     */
    async requestStatus({token, switchId}) {
        console.debug('Requesting switch status');

        const headers = {
            'Authorization': `Token token=${token}`,
            'User-Agent': 'Caavo Olive v11.3',
            'Content-Type': 'application/json'
        };
        const requestConfig = {headers};

        const response = await axios.get(`https://api.caavo.com/clients/switches/state?switch_id=${switchId}`, requestConfig);

        console.debug('Raw status response:');
        console.debug(response.data);

        return this.formatStateResponse(response.data);
    }

    /**
     * 
     * @param {string} token - Auth token
     * @param {string} switchId - Id of switch to receive action
     * @param {string} action - Command action
     * @param {string} longPress -Is action a long press
     */
    async requestSendCommand({token, switchId, action, longPress}) {
        const requestId = uuidv4().toUpperCase();

        const headers = {
            'Authorization': `Token token=${token}`,
            'User-Agent': 'Caavo Olive v11.3',
            'Content-Type': 'application/json'
        };
        const requestConfig = {headers};

        const response = await axios.post('https://api.caavo.com/control/switches/send_commands', {
            'switch_id': switchId,
            'commands': `{"sub_type":"remote_user","source":"olive","request_id":"${requestId}","version":"1.0.0","type":"control","payload":{"command":"control","data":{"op":"${action}","is_long_press":${longPress}}}}`
        }, requestConfig);

        console.debug('Raw send command response:');
        console.debug(response);
    }

    /**
     * 
     * @param {*} response Switch state response
     */
    formatStateResponse(response) {
        return {
            switchId: response.switch_id,
            switchName: response.general_config.name,
            powerState: response.general_config.power_state,
            updatedAt: response.updated_at
        };
    }
}
