import axios from 'axios';
import { normalizeData } from './normalizer';

const BASE_URL = 'http://localhost:8080/api';

export async function startRestPoller() {
    console.log("Starting REST Poller...");
    
    try {
        // 1. Fetch the list of available sensors [cite: 37, 39]
        const response = await axios.get(`${BASE_URL}/sensors`);
        const sensors: string[] = response.data.sensors;
        
        // 2. Poll each sensor periodically (e.g., every 5 seconds)
        setInterval(async () => {
            for (const sensorId of sensors) {
                try {
                    // Fetch the current state of the sensor
                    const sensorData = await axios.get(`${BASE_URL}/sensors/${sensorId}`);
                    
                    // 3. Normalize the raw JSON data
                    const normalized = normalizeData(sensorData.data);
                    
                    if (normalized) {
                        // For now, print to the console. Later, send to RabbitMQ.
                        console.log(`[REST NORMALIZED] ${sensorId}:`, JSON.stringify(normalized));
                    }
                } catch (err) {
                    console.error(`Error reading sensor ${sensorId}:`, err);
                }
            }
        }, 5000); // 5 seconds polling interval
        
    } catch (error) {
        console.error("Critical error in REST Poller:", error);
    }
}