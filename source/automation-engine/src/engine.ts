import { NormalizedEvent, Rule } from './types';
import { setActuatorState } from './actuatorClient';

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

export async function processEvent(event: NormalizedEvent, rules: Rule[]) {
  console.log(`\n[BRAIN] Analyzing event from: ${event.device_id}`);

  // Loop through all readings present in the event
  for (const reading of event.readings) {
    // Find all active rules that target this specific metric
    const matchingRules = rules.filter(r => r.is_active && r.condition_metric === reading.metric);

    for (const rule of matchingRules) {
      console.log(`  -> Checking rule '${rule.name}' (${reading.metric} ${rule.condition_operator} ${rule.condition_value})`);
      
      const isConditionMet = evaluateCondition(reading.value, rule.condition_operator, rule.condition_value);

      if (isConditionMet) {
        console.log(`  *** CONDITION MET! Current value: ${reading.value} ***`);
        // Call the simulator to change the actuator state
        await setActuatorState(rule.target_actuator, rule.target_state);
      }
    }
  }
}