import axios from 'axios';
import { SIMULATOR_URL } from 'common.constants';
import { State } from 'common.types';

export async function getActuatorList(): Promise<Record<string, State>> {
    const response = await axios.get(`http://${SIMULATOR_URL}/api/actuators`);
    return response.data.actuators;
}

export async function setActuatorState(actuator: string, state: State): Promise<void> {
    const url = `http://${SIMULATOR_URL}/api/actuators/${actuator}`;
    const response = await axios.post(url, { state });
    console.log(`[ACTION] ${actuator} -> ${state}:`, response.data);
}

export const mapAirLockLastState = {
    // IDLE = 0, PRESSURIZING = 1, DEPRESSURIZING = 2, INVALID = -1
    enumToNumber: (last_state: string) => {
        let stateCode = -1;
        if (last_state === "IDLE") stateCode = 0;
        else if (last_state === "PRESSURIZING") stateCode = 1;
        else if (last_state === "DEPRESSURIZING") stateCode = 2;
        return stateCode;
    },
    numberToEnum: (stateCode: number) => {
        let last_state = "INVALID"
        if (stateCode === 0) last_state = "IDLE";
        else if (stateCode === 1) last_state = "PRESSURIZING";
        else if (stateCode === 2) last_state = "DEPRESSURIZING";
        return stateCode;
    },
}