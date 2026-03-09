import axios from 'axios';
import WebSocket from 'ws';
import { SIMULATOR_URL } from 'common.constants';
import RabbitDriver from 'driver.rabbit';
import { normalizeData } from './normalizer';

export async function startTelemetryStreamer(driver: RabbitDriver) {
    console.log("Starting Telemetry Streamer with RabbitMQ...");

    const response = await axios.get(`http://${SIMULATOR_URL}/api/telemetry/topics`);
    const topics: string[] = response.data.topics;

    for (const topic of topics) {
        await startWebSocket(topic, driver);
    }

    console.log("Telemetry Streamer started");

}

async function startWebSocket(topic: string, driver: RabbitDriver) {

    const wsUrl = `ws://${SIMULATOR_URL}/api/telemetry/ws?topic=${topic}`;
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
                driver.publish(buffer);
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
        setTimeout(() => {
            startWebSocket(topic, driver);
        }, 5000);
    });
}