import axios from 'axios';
import WebSocket from 'ws';
import amqp from 'amqplib'; 
import { normalizeData } from './normalizer';

const BASE_URL = process.env.SIMULATOR_BASE_URL || 'http://localhost:8080/api';
const RABBIT_URL = process.env.RABBIT_URL || 'amqp://localhost';
const WS_BASE_URL = process.env.WS_BASE_URL || 'ws://localhost:8080/api';
const EXCHANGE_NAME = 'telemetry_fanout';

export async function startTelemetryStreamer() {
    console.log("Starting Telemetry Streamer with RabbitMQ...");
    
    try {
        const connection = await amqp.connect(RABBIT_URL);
        const channel = await connection.createChannel();
        
        // NEW ARCHITECTURE: Use Exchange instead of Queue
        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
        console.log(`Connected to RabbitMQ. Target Exchange: ${EXCHANGE_NAME}`);

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
                        const buffer = Buffer.from(JSON.stringify(normalized));
                        // PUBLISH TO THE EXCHANGE
                        channel.publish(EXCHANGE_NAME, '', buffer);
                        
                        console.log(`[RABBIT] Published telemetry: ${normalized.device_id}`);
                    }
                } catch (err) {
                    console.error(`Error processing message from ${topic}:`, err);
                }
            });
            
            ws.on('error', (error) => {
                console.error(`WebSocket error for ${topic}:`, error);
            });

            ws.on('close', () => {
                console.warn(`WebSocket closed for ${topic}.`);
            });
        }
    } catch (error) {
        console.error("RabbitMQ not ready for the Streamer. Retrying in 5 seconds...");
        setTimeout(startTelemetryStreamer, 5000);
    }
}