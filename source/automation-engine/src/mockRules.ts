import { Rule } from './types';

// Quando metterai MongoDB, questa lista verrà scaricata dal DB
export const mockRules: Rule[] = [
  {
    rule_id: "rule-001",
    name: "Auto-Cooling",
    condition_metric: "greenhouse_temperature",
    condition_operator: ">",
    condition_value: 28.0,
    target_actuator: "cooling_fan",
    target_state: "ON",
    is_active: true
  }
];