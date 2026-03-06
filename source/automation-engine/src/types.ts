export interface Reading {
  metric: string;
  value: number;
  unit: string;
}

export interface NormalizedEvent {
  device_id: string;
  timestamp: string;
  status: string;
  readings: Reading[];
}

export interface Rule {
  rule_id: string;
  name: string;
  condition_metric: string;
  condition_operator: string;
  condition_value: number;
  target_actuator: string;
  target_state: "ON" | "OFF";
  is_active: boolean;
}

export interface Alert {
  device_id: string;
  message: string;
  timestamp: string;
  actuator: string;
  state: string;
}