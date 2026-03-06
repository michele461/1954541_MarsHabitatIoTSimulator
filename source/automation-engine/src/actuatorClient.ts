import axios from 'axios';

// URL del simulatore. Usiamo una variabile d'ambiente per quando userete Docker.
const SIMULATOR_URL = process.env.SIMULATOR_URL || 'http://localhost:8080';

export async function setActuatorState(actuator: string, state: "ON" | "OFF"): Promise<void> {
  try {
    const url = `${SIMULATOR_URL}/api/actuators/${actuator}`;
    // Esegue una POST con payload JSON {"state": "ON" o "OFF"}
    const response = await axios.post(url, { state });
    console.log(`[AZIONE] Attuatore '${actuator}' impostato su ${state}. Risposta:`, response.data);
  } catch (error) {
    console.error(`[ERRORE] Impossibile contattare l'attuatore '${actuator}':`, error);
  }
}