import { Alert, Operator, StandardEvent } from 'common.types';
import { setActuatorState, getActuatorList } from 'common.functions';
import MongoDriver from 'driver.mongo';

// MEMORY: Tracks the last state sent to avoid spamming the simulator

function evaluateCondition(value: number, operator: Operator, threshold: number): boolean {
    switch (operator) {
        case Operator['<']: return value < threshold;
        case Operator['<=']: return value <= threshold;
        case Operator['=']: return value == threshold;
        case Operator['>']: return value > threshold;
        case Operator['>=']: return value >= threshold;
        default: return false;
    }
}

export async function processEvent(event: StandardEvent, mongoDriver: MongoDriver, onAlert: (alert: Alert) => void) {
    const actuatorsState = await getActuatorList();
    const rules = await mongoDriver.getAllAutomation();
    if (rules.length === 0) return;
    for (const reading of event.readings) {
        const matchingRules = rules.filter(r => r.device_id === event.device_id && r.device_metric === reading.metric);

        for (const rule of matchingRules) {
            const isConditionMet = evaluateCondition(reading.value, rule.operator, rule.value);

            if (isConditionMet) {
                const currentState = actuatorsState[rule.actuator_id];

                // Only act if the state is DIFFERENT from the target state
                if (currentState !== rule.actuator_state) {
                    try {
                        await setActuatorState(rule.actuator_id, rule.actuator_state);
                        const newAlert: Alert = {
                            device_id: event.device_id,
                            message: `Automation on ${rule.device_id} triggered: ${reading.metric} is ${reading.value}`,
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