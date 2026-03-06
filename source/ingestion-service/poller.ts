import axios from 'axios';
import amqp from 'amqplib'; //
import { normalizeData } from './normalizer';

const BASE_URL = 'http://localhost:8080/api';
const RABBIT_URL = 'amqp://localhost';
const QUEUE_NAME = 'normalized_events';

export async function startRestPoller() {
    console.log("🚀 Starting REST Poller with RabbitMQ...");
    
    try {
        // 1. Inizializzazione RabbitMQ
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`🐰 Poller connesso a RabbitMQ. Coda: ${QUEUE_NAME}`);

        // 2. Recupero lista sensori
        const response = await axios.get(`${BASE_URL}/sensors`);
        const sensors: string[] = response.data.sensors;
        
        // 3. Loop di polling ogni 5 secondi
        setInterval(async () => {
            for (const sensorId of sensors) {
                try {
                    // Fetch dei dati grezzi dal simulatore
                    const sensorData = await axios.get(`${BASE_URL}/sensors/${sensorId}`);
                    
                    // Normalizzazione nel formato StandardEvent
                    const normalized = normalizeData(sensorData.data);
                    
                    if (normalized) {
                        // INVIO AL BROKER (Sostituisce axios.post)
                        const buffer = Buffer.from(JSON.stringify(normalized));
                        channel.sendToQueue(QUEUE_NAME, buffer);
                        
                        console.log(`[RABBIT] Published sensor: ${normalized.device_id}`);
                    }
                } catch (err) {
                    console.error(`Error reading sensor ${sensorId}:`, err);
                }
            }
        }, 5000); 
        
    } catch (error) {
        console.error("Critical error in REST Poller:", error);
    }
}