import axios from 'axios';
import WebSocket from 'ws';
import { normalizeData } from './normalizer';

const BASE_URL = 'http://localhost:8080/api';
const WS_BASE_URL = 'ws://localhost:8080/api';

export async function startTelemetryStreamer() {
    console.log("Starting Telemetry Streamer...");
    
    try {
        // 1. Fetch the list of available telemetry topics [cite: 44, 45]
        const response = await axios.get(`${BASE_URL}/telemetry/topics`);
        const topics: string[] = response.data.topics;
        
        // 2. Connect to the WebSocket for each topic [cite: 47, 50]
        for (const topic of topics) {
            const wsUrl = `${WS_BASE_URL}/telemetry/ws?topic=${topic}`;
            const ws = new WebSocket(wsUrl);
            
            ws.on('open', () => {
                console.log(`Connected to WebSocket topic: ${topic}`);
            });
            
            ws.on('message', (message: string) => {
                try {
                    const rawData = JSON.parse(message);
                    
                    // 3. Normalize the raw streaming data
                    const normalized = normalizeData(rawData);
                    
                    if (normalized) {
                        // For now I print to the console. Later I'll send to RabbitMQ ------------------------------------------------------------------------------
                        console.log(`[STREAM NORMALIZED] ${topic}:`, JSON.stringify(normalized));
                    }
                } catch (err) {
                    console.error(`Error parsing message from ${topic}:`, err);
                }
            });
            
            ws.on('error', (error) => {
                console.error(`WebSocket error for ${topic}:`, error);
            });
        }
    } catch (error) {
        console.error("Critical error in Telemetry Streamer:", error);
    }
}