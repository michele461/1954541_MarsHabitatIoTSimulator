import axios from 'axios';
import { type Channel } from 'amqplib';
import { SIMULATOR_URL, EXCHANGE_NAME } from 'common.constants';
import { normalizeData } from './normalizer';


export async function startRestPoller(channel: Channel) {
    console.log("Starting REST Poller with RabbitMQ...");

    const response = await axios.get(`${SIMULATOR_URL}/api/sensors`);
    const sensors: string[] = response.data.sensors;

    setInterval(async () => {
        for (const sensorId of sensors) {
            try {
                const sensorData = await axios.get(`${SIMULATOR_URL}/api/sensors/${sensorId}`);
                const normalized = normalizeData(sensorData.data);
                if (normalized) {
                    const buffer = Buffer.from(JSON.stringify(normalized));
                    channel.publish(EXCHANGE_NAME, '', buffer);
                    console.log(`[RABBIT] Published sensor: ${normalized.device_id}`);
                }
            } catch (err) {
                console.error(`Error reading sensor ${sensorId}:`, err);
            }
        }
    }, 5000);

    console.log("REST Poller started");
}