import axios from 'axios';
import amqp from 'amqplib'; 
import { normalizeData } from './normalizer';

const BASE_URL = process.env.SIMULATOR_BASE_URL || 'http://localhost:8080/api';
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';
const EXCHANGE_NAME = 'telemetry_fanout';

export async function startRestPoller() {
    console.log("Starting REST Poller with RabbitMQ...");
    
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        
        // NEW ARCHITECTURE: Use Exchange instead of Queue
        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
        console.log(`Poller connected to RabbitMQ. Exchange: ${EXCHANGE_NAME}`);

        const response = await axios.get(`${BASE_URL}/sensors`);
        const sensors: string[] = response.data.sensors;
        
        setInterval(async () => {
            for (const sensorId of sensors) {
                try {
                    const sensorData = await axios.get(`${BASE_URL}/sensors/${sensorId}`);
                    const normalized = normalizeData(sensorData.data);
                    
                    if (normalized) {
                        const buffer = Buffer.from(JSON.stringify(normalized));
                        // PUBLISH TO THE EXCHANGE INSTEAD OF THE QUEUE
                        channel.publish(EXCHANGE_NAME, '', buffer);
                        
                        console.log(`[RABBIT] Published sensor: ${normalized.device_id}`);
                    }
                } catch (err) {
                    console.error(`Error reading sensor ${sensorId}:`, err);
                }
            }
        }, 5000); 
        
    } catch (error) {
        console.error("RabbitMQ not ready for the Poller. Retrying in 5 seconds...");
        setTimeout(startRestPoller, 5000);
    }
}