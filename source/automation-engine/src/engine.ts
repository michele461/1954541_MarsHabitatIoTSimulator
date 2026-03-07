import { NormalizedEvent, Rule, Alert } from './types';
import { setActuatorState } from './actuatorClient';

// MEMORY: Tracks the last state sent to avoid spamming the simulator
const actuatorStateCache: Record<string, string> = {};

function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '<': return value < threshold;
    case '<=': return value <= threshold;
    case '=': return value === threshold;
    case '>': return value > threshold;
    case '>=': return value >= threshold;
    default: return false;
  }
}

export async function processEvent(
  event: NormalizedEvent, 
  rules: Rule[], 
  onAlert: (alert: Alert) => void
) {
  for (const reading of event.readings) {
    const matchingRules = rules.filter(r => r.is_active && r.condition_metric === reading.metric);

    for (const rule of matchingRules) {
      const isConditionMet = evaluateCondition(reading.value, rule.condition_operator, rule.condition_value);

      if (isConditionMet) {
        // Check what state the actuator is currently in
        const currentState = actuatorStateCache[rule.target_actuator];
        
        // Only act if the state is DIFFERENT from the target state (or if it's the first time)
        if (currentState !== rule.target_state) {
          
          await setActuatorState(rule.target_actuator, rule.target_state);
          
          // Update memory with the new state
          actuatorStateCache[rule.target_actuator] = rule.target_state;
          
          const newAlert: Alert = {
            device_id: event.device_id,
            message: `Rule ${rule.name} triggered: ${reading.metric} is ${reading.value}`,
            timestamp: new Date().toISOString(),
            actuator: rule.target_actuator,
            state: rule.target_state
          };
          
          onAlert(newAlert);
        }
      }
    }
  }
}