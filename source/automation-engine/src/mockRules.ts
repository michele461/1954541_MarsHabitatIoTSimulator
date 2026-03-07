import { Rule } from './types';

export const mockRules: Rule[] = [
  {
    rule_id: "rule-001",
    name: "Auto-Cooling",
    condition_metric: "temperature_c",
    condition_operator: ">",
    condition_value: 28.0,
    target_actuator: "cooling_fan",
    target_state: "ON",
    is_active: true
  },
  {
    rule_id: "rule-002",
    name: "Low-Oxygen-Emergency",
    condition_metric: "oxygen_percent",
    condition_operator: "<",
    condition_value: 19.5,
    target_actuator: "life_support_vent",
    target_state: "ON",
    is_active: true
  },
  {
    rule_id: "rule-003",
    name: "High-Radiation-Lockdown",
    condition_metric: "radiation_uSv_h",
    condition_operator: ">",
    condition_value: 0.5,
    target_actuator: "airlock_shield",
    target_state: "ON",
    is_active: true
  },
  {
    rule_id: "rule-004",
    name: "Heater-Activation",
    condition_metric: "temperature_c",
    condition_operator: "<",
    condition_value: 15.0,
    target_actuator: "heating_unit",
    target_state: "ON",
    is_active: true
  }
];