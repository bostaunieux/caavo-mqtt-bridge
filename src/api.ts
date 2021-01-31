import axios from "axios";
import { v4 as uuidv4, v5 as uuidv5 } from "uuid";
import { snakeCase } from "lodash";
import {
  ACTION_MAP,
  ApiOptions,
  AuthConfig,
  HubState,
  RegisterResponse,
  SendCommand,
  SendCommandRequest,
  SignInResponse,
  StateResponse,
  Switch,
  SwitchResponse,
} from "./types";

/**
 * Random UUID to use as base for uuid v5-based device id
 */
const UUID_NAMESPACE = "de41f068-cf15-40c9-978d-8c8c33532e55";
/**
 * Expire auth token after 6 hours
 */
const TOKEN_EXPIRATION_SECONDS = 6 * 60 * 60;

const CAAVO_APP_USER_AGENT = "Caavo Olive v2.5.86";

export default class Api {
  private username: string;
  private password: string;
  private auth: AuthConfig | null;
  private deviceId: string;

  constructor({ username, password }: ApiOptions) {
    this.username = username;
    this.password = password;
    this.auth = null;
    // Generate a v5 uuid based off the username. This ensures it won't change between service restarts.
    // This will mimic a unique device identifier used with the app
    // TODO: Make device id seed an optional param to all users to control id generation
    this.deviceId = uuidv5(username, UUID_NAMESPACE).toUpperCase();
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
    console.info("Finding switches");

    try {
      return await this.requestSwitches();
    } catch (error) {
      console.error("Failed fetching switches: %s", error);
      return null;
    }
  }

  /**
   * Send the specified action to the provided switch
   * @param {SendCommand} param
   */
  public async sendCommand({ action, switchId }: SendCommand): Promise<void> {
    console.info("Send command '%s' to switch '%s'", action, switchId);

    try {
      const normalizedAction = ACTION_MAP[action];
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
  private async getAuthentication(): Promise<AuthConfig> {
    if (this.auth) {
      console.info("Using previously fetch auth token");
      return this.auth;
    }

    console.info("Fetching new auth token");

    try {
      const { token, cookie } = await this.login();

      console.info("Received new auth token and cookie");

      // store the newly fetched token
      this.auth = { token, cookie };

      // set a timer to clear the auth when it expires
      setTimeout(() => {
        console.info("Expiring auth token");
        this.auth = null;
      }, TOKEN_EXPIRATION_SECONDS * 1000);

      return this.auth;
    } catch (error) {
      throw new Error(`Failed fetching auth token: ${error.message}`);
    }
  }

  private async login(): Promise<AuthConfig> {
    console.debug("Making register device request");

    const registerResponse = await axios.post<RegisterResponse>(
      "https://api.caavo.com/clients/register",
      {
        version: "2.5",
        client_type: "ios",
        new_launch: true,
        device_id: this.deviceId,
      },
      {
        headers: this.getHeaders(),
      }
    );

    if (registerResponse?.status !== 200 || !registerResponse?.data?.access_token) {
      throw new Error(`Invalid register response; received message: ${registerResponse.statusText}`);
    }

    const token = registerResponse.data.access_token;

    console.debug("Making sign-in request");
    const signinResponse = await axios.post<SignInResponse>(
      "https://api.caavo.com/clients/signin",
      {
        user: {
          password: this.password,
          email: this.username,
        },
      },
      {
        headers: this.getHeaders({ token }),
      }
    );

    const cookie = signinResponse?.headers["set-cookie"] ? String(signinResponse?.headers["set-cookie"]) : null;
    const caavoCookie = cookie?.match(/_caavo=\w+/)?.[0];
    if (!caavoCookie) {
      throw new Error(`Invalid signin response; received message: ${signinResponse.statusText}`);
    }

    return {
      token,
      cookie: caavoCookie,
    };
  }

  /**
   * Fetch hub state
   */
  private async requestStatus({ switchId }: { switchId: string }): Promise<HubState> {
    console.debug("Requesting switch status for switch id: %s", switchId);

    const authConfig = await this.getAuthentication();

    const response = await axios.get<StateResponse>(
      `https://api.caavo.com/clients/switches/state?switch_id=${switchId}`,
      { headers: this.getHeaders(authConfig) }
    );

    return Api.formatStateResponse(response.data);
  }

  /**
   * Fetch the switches available for the user
   */
  private async requestSwitches(): Promise<Switch[]> {
    console.debug("Requesting switch list");

    const auth = await this.getAuthentication();

    const response = await axios.get<SwitchResponse[]>("https://api.caavo.com/clients/switches/box_config/all", {
      headers: this.getHeaders(auth),
    });

    return Api.formatSwitchResponse(response.data);
  }

  /**
   * Send a command for controlled a switch
   */
  private async requestSendCommand({ switchId, action, longPress }: SendCommandRequest): Promise<void> {
    console.debug("Sending switch command");

    const requestId = uuidv4().toUpperCase();

    const authConfig = await this.getAuthentication();

    await axios.post(
      "https://api.caavo.com/control/switches/send_commands",
      {
        switch_id: switchId,
        commands: `{"sub_type":"remote_user","source":"olive","request_id":"${requestId}","version":"1.0.0","type":"control","payload":{"command":"control","data":{"op":"${action}","is_long_press":${longPress}}}}`,
      },
      { headers: this.getHeaders(authConfig) }
    );
  }

  private getHeaders(authConfig?: AuthConfig) {
    const headers: Record<string, string> = {
      "User-Agent": CAAVO_APP_USER_AGENT,
      "Content-Type": "application/json",
    };

    authConfig?.cookie && (headers["Cookie"] = authConfig.cookie);
    authConfig?.token && (headers["Authorization"] = `Token token=${authConfig.token}`);

    console.debug("Generated headers: %s", headers);
    return headers;
  }

  /**
   * Format a state response
   */
  static formatStateResponse(response: StateResponse): HubState {
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
  static formatSwitchResponse(response: SwitchResponse[]): Switch[] {
    return (response || []).map((entry) => ({
      id: entry.state.switchID,
      friendlyName: entry.state.caavoName,
      name: snakeCase(entry.state.caavoName),
      macAddress: entry.state.mac,
    }));
  }
}
