import axios from 'axios';

const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:8080';

export async function setActuatorState(actuator: string, state: "ON" | "OFF"): Promise<void> {
  try {
    const url = `${SIMULATOR_URL}/api/actuators/${actuator}`;
    const response = await axios.post(url, { state });
    console.log(`[ACTION] ${actuator} -> ${state}`, response.data);
  } catch (error) {
    console.error(`[ERROR] ${actuator}:`, error);
  }
}