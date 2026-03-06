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
  console.log(`\n[CERVELLO] Analizzo evento da: ${event.device_id}`);

  // Cicliamo su tutte le letture presenti nell'evento
  for (const reading of event.readings) {
    // Troviamo tutte le regole attive che riguardano questa specifica metrica
    const matchingRules = rules.filter(r => r.is_active && r.condition_metric === reading.metric);

    for (const rule of matchingRules) {
      console.log(`  -> Controllo regola '${rule.name}' (${reading.metric} ${rule.condition_operator} ${rule.condition_value})`);
      
      const isConditionMet = evaluateCondition(reading.value, rule.condition_operator, rule.condition_value);

      if (isConditionMet) {
        console.log(`  *** CONDIZIONE SODDISFATTA! Valore attuale: ${reading.value} ***`);
        // Chiama il simulatore per cambiare lo stato dell'attuatore
        await setActuatorState(rule.target_actuator, rule.target_state);
      }
    }
  }
}