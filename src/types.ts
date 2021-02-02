export const ACTION_MAP = {
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

export interface ApiOptions {
  username: string;
  password: string;
  deviceIdSeed?: string;
}

export interface AuthConfig {
  token: string;
  cookie?: string;
}

export type Action = keyof typeof ACTION_MAP;
export type InternalAction = typeof ACTION_MAP[Action];

export interface SendCommandRequest {
  action: InternalAction;
  switchId: string;
  longPress: boolean;
}

export interface GeneralConfig {
  name: string;
  power_state: string;
}

export interface StateResponse {
  switch_id: string;
  general_config: GeneralConfig;
  updated_at: string;
}

export interface SwitchState {
  mac: string;
  switchID: string;
  caavoName: string;
  powerState: "ON" | "OFF";
  lastUpdated: string;
}

export interface SwitchResponse {
  state: SwitchState;
}

export interface RegisterResponse {
  access_token: string;
}

export interface SignInResponse {
  success: boolean;
  name: string;
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
