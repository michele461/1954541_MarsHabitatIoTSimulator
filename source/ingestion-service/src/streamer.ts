import axios from 'axios';
import WebSocket from 'ws';
import amqp from 'amqplib'; 
import { normalizeData } from './normalizer';

const BASE_URL = process.env.SIMULATOR_BASE_URL || 'http://localhost:8080/api';
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';
const WS_BASE_URL = process.env.WS_BASE_URL || 'ws://localhost:8080/api';
const QUEUE_NAME = 'normalized_events';

export async function startTelemetryStreamer() {
    console.log("Starting Telemetry Streamer with RabbitMQ...");
    
    try {
        // 1. Initialize RabbitMQ connection
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });
        console.log(`Connected to RabbitMQ. Target Queue: ${QUEUE_NAME}`);

        // 2. Fetch telemetry topics
        const response = await axios.get(`${BASE_URL}/telemetry/topics`);
        const topics: string[] = response.data.topics;
        
        for (const topic of topics) {
            const wsUrl = `${WS_BASE_URL}/telemetry/ws?topic=${topic}`;
            const ws = new WebSocket(wsUrl);
            
            ws.on('open', () => {
                console.log(`Connected to WebSocket topic: ${topic}`);
            });
            
            ws.on('message', (message: string) => {
                try {
                    const rawData = JSON.parse(message);
                    const normalized = normalizeData(rawData); 
                    
                    if (normalized) {
                        // 3. Send to Broker instead of via HTTP
                        const buffer = Buffer.from(JSON.stringify(normalized));
                        channel.sendToQueue(QUEUE_NAME, buffer);
                        
                        console.log(`[RABBIT] Published telemetry: ${normalized.device_id}`);
                    }
                } catch (err) {
                    console.error(`Error processing message from ${topic}:`, err);
                }
            });
            
            ws.on('error', (error) => {
                console.error(`WebSocket error for ${topic}:`, error);
            });

            // Clean closure handling
            ws.on('close', () => {
                console.warn(`WebSocket closed for ${topic}.`);
            });
        }
    } catch (error) {
        console.error("Critical error in Telemetry Streamer:", error);
    }
}