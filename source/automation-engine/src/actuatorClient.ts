import axios from 'axios';

// Simulator URL. We use an environment variable for when you will use Docker.
const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:8080';

export async function setActuatorState(actuator: string, state: "ON" | "OFF"): Promise<void> {
  try {
    const url = `${SIMULATOR_URL}/api/actuators/${actuator}`;
    // Executes a POST request with JSON payload {"state": "ON" or "OFF"}
    const response = await axios.post(url, { state });
    console.log(`[ACTION] Actuator '${actuator}' set to ${state}. Response:`, response.data);
  } catch (error) {
    console.error(`[ERROR] Unable to contact actuator '${actuator}':`, error);
  }
}