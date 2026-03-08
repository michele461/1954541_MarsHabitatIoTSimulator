import { Alert, StandardEvent } from 'common.types';
import { setActuatorState } from 'common.functions';
import MongoDriver from 'driver.mongo';

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

export async function processEvent(event: StandardEvent, mongoDriver: MongoDriver, onAlert: (alert: Alert) => void) {
    for (const reading of event.readings) {
        const rules = await mongoDriver.getAllAutomation();
        const matchingRules = rules.filter(r => r.is_active && r.device_metric === reading.metric);

        for (const rule of matchingRules) {
            const isConditionMet = evaluateCondition(reading.value, rule.operator, rule.value);

            if (isConditionMet) {
                // Check what state the actuator is currently in
                const currentState = actuatorStateCache[rule.actuator_id];

                // Only act if the state is DIFFERENT from the target state (or if it's the first time)
                if (currentState !== rule.actuator_state) {
                    try {
                        await setActuatorState(rule.actuator_id, rule.actuator_state);

                        // Update memory with the new state
                        actuatorStateCache[rule.actuator_id] = rule.actuator_state;

                        const newAlert: Alert = {
                            device_id: event.device_id,
                            message: `Rule ${rule.name} triggered: ${reading.metric} is ${reading.value}`,
                            timestamp: new Date().toISOString(),
                            actuator: rule.actuator_id,
                            state: rule.actuator_state
                        };

                        onAlert(newAlert);
                    } catch (error) {
                        console.error(`[ERROR] ${rule.actuator_id}:`, error);
                    }

                }
            }
        }
    }
}