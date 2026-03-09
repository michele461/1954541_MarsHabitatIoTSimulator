import axios from 'axios';
import { SIMULATOR_URL } from 'common.constants';
import RabbitDriver from 'driver.rabbit';
import { normalizeData } from './normalizer';


export async function startRestPoller(driver: RabbitDriver) {
    console.log("Starting REST Poller with RabbitMQ...");

    const response = await axios.get(`http://${SIMULATOR_URL}/api/sensors`);
    const sensors: string[] = response.data.sensors;

    setInterval(async () => {
        for (const sensorId of sensors) {
            try {
                const sensorData = await axios.get(`http://${SIMULATOR_URL}/api/sensors/${sensorId}`);
                const normalized = normalizeData(sensorData.data);
                if (normalized) {
                    const buffer = Buffer.from(JSON.stringify(normalized));
                    driver.publish(buffer);
                    console.log(`[RABBIT] Published sensor: ${normalized.device_id}`);
                }
            } catch (err) {
                console.error(`Error reading sensor ${sensorId}:`, err);
            }
        }
    }, 5000);

    console.log("REST Poller started");
}