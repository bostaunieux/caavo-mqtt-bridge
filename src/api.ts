import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { snakeCase } from "lodash";

const actionMap = {
  vol_up: "IncreaseVolume",
  vol_down: "DecreaseVolume",
  play: "Play",
  mute: "Mute",
  back: "GoBack",
  home: "DeviceHome",
  forward: "Forward",
  rewind: "Rewind",
  dir_up: "Up",
  dir_down: "Down",
  dir_left: "Previous",
  dir_right: "Next",
  select: "Select",
  power_on: "Power",
  power_off: "Power",
};

type Action = keyof typeof actionMap;
type InternalAction = typeof actionMap[Action];

interface SendCommandRequest {
  action: InternalAction;
  switchId: string;
  longPress: boolean;
}

interface GeneralConfig {
  name: string;
  power_state: string;
}

interface StateResponse {
  switch_id: string;
  general_config: GeneralConfig;
  updated_at: string;
}

interface SwitchResponse {
  uuid: string;
  friendly_name: string;
  mac_ethernet: string;
}

interface RegisterResponse {
  access_token: string;
}

export interface SendCommand {
  action: Action;
  switchId: string;
}

export interface Switch {
  id: string;
  friendlyName: string;
  name: string;
  macAddress: string;
}

export interface HubState {
  switchId: string;
  switchName: string;
  powerState: string;
  updatedAt: string;
}

export default class Api {
  private deviceId: string;
  private accessToken: string | null;

  constructor({ deviceId }: { deviceId: string }) {
    this.deviceId = deviceId;
    this.accessToken = null;
  }

  /**
   * Fetch the current state of the given switch
   * @param {{switchId: {string}}} param
   */
  public async getState({ switchId }: { switchId: string }): Promise<HubState | null> {
    try {
      return await this.requestStatus({ switchId });
    } catch (error) {
      console.error("Failed fetching state", error);
      return null;
    }
  }

  /**
   * Find all available switches
   */
  public async findSwitches(): Promise<Switch[] | null> {
    try {
      return await this.requestSwitches();
    } catch (error) {
      console.error("Failed fetching switches: %s", error);
      return null;
    }
  }

  /**
   * Send the following action to the provided switch
   * @param {SnedCommand} param
   */
  public async sendCommand({ action, switchId }: SendCommand): Promise<void> {
    try {
      const normalizedAction = actionMap[action];
      const longPress = action === "power_off";

      if (!normalizedAction) {
        throw new Error(`Unrecognized action: ${action}`);
      }

      return await this.requestSendCommand({ switchId, action: normalizedAction, longPress });
    } catch (error) {
      console.error("Failed sending command: %s", error);
    }
  }

  /**
   * Fetch an access token if one isn't available
   */
  private async getToken(): Promise<string> {
    // TODO: need to invalidate old token
    // const now = new Date().getTime();

    if (this.accessToken) {
      console.info("Found existing token; using");
      return this.accessToken;
    }

    console.info("No valid stored token found; fetching new token");

    try {
      const accessToken = await this.register();

      console.info("Received new token");

      // store the newly fetched token
      this.accessToken = accessToken;

      return accessToken;
    } catch (error) {
      throw new Error(`Unable to fetch new token: ${error.message}`);
    }
  }

  private async register(): Promise<string> {
    const headers = {
      "User-Agent": "Caavo Olive v11.3",
      "Content-Type": "application/json",
    };
    const requestConfig = { headers };

    const response = await axios.post<RegisterResponse>(
      "https://api.caavo.com/clients/register",
      {
        version: "2.3",
        new_launch: true,
        client_type: "ios",
        device_id: this.deviceId,
      },
      requestConfig
    );

    if (!response || !response.data || !response.data.access_token) {
      throw new Error(`Invalid token api response; received message: ${response.statusText}`);
    }

    return response.data.access_token;
  }

  /**
   * Fetch hub state
   */
  private async requestStatus({ switchId }: { switchId: string }): Promise<HubState> {
    console.debug("Requesting switch status");

    const token = await this.getToken();

    const headers = {
      Authorization: `Token token=${token}`,
      "User-Agent": "Caavo Olive v11.3",
      "Content-Type": "application/json",
    };
    const requestConfig = { headers };

    const response = await axios.get<StateResponse>(
      `https://api.caavo.com/clients/switches/state?switch_id=${switchId}`,
      requestConfig
    );

    return this.formatStateResponse(response.data);
  }

  /**
   * Fetch the switches available for the user
   */
  private async requestSwitches(): Promise<Switch[]> {
    console.debug("Requesting switch list");

    const token = await this.getToken();

    const headers = {
      Authorization: `Token token=${token}`,
      "User-Agent": "Caavo Olive v11.3",
      "Content-Type": "application/json",
    };
    const requestConfig = { headers };

    const response = await axios.get<SwitchResponse[]>("https://api.caavo.com/clients/users/switches", requestConfig);

    return this.formatSwitchResponse(response.data);
  }

  /**
   * Send a command for controlled a switch
   */
  private async requestSendCommand({ switchId, action, longPress }: SendCommandRequest): Promise<void> {
    const requestId = uuidv4().toUpperCase();
    const token = await this.getToken();

    const headers = {
      Authorization: `Token token=${token}`,
      "User-Agent": "Caavo Olive v11.3",
      "Content-Type": "application/json",
    };
    const requestConfig = { headers };

    await axios.post(
      "https://api.caavo.com/control/switches/send_commands",
      {
        switch_id: switchId,
        commands: `{"sub_type":"remote_user","source":"olive","request_id":"${requestId}","version":"1.0.0","type":"control","payload":{"command":"control","data":{"op":"${action}","is_long_press":${longPress}}}}`,
      },
      requestConfig
    );
  }

  /**
   * Format a state response
   */
  private formatStateResponse(response: StateResponse): HubState {
    return {
      switchId: response.switch_id,
      switchName: response.general_config.name,
      powerState: response.general_config.power_state,
      updatedAt: response.updated_at,
    };
  }

  /**
   * Format a switch response
   */
  private formatSwitchResponse(response: SwitchResponse[]): Switch[] {
    return (response || []).map((entry) => ({
      id: entry.uuid,
      friendlyName: entry.friendly_name,
      name: snakeCase(entry.friendly_name),
      macAddress: entry.mac_ethernet,
    }));
  }
}
