import axios from 'axios';
import WebSocket from 'ws';
import { Channel } from 'amqplib';
import { SIMULATOR_URL, EXCHANGE_NAME, WS_BASE_URL } from 'common.constants';
import { normalizeData } from './normalizer';

export async function startTelemetryStreamer(channel: Channel) {
    console.log("Starting Telemetry Streamer with RabbitMQ...");

    const response = await axios.get(`${SIMULATOR_URL}/api/telemetry/topics`);
    const topics: string[] = response.data.topics;

    for (const topic of topics) {
        await startWebSocket(topic, channel);
    }

    console.log("Telemetry Streamer started");

}

async function startWebSocket(topic: string, channel: Channel) {

    const wsUrl = `${WS_BASE_URL}/api/telemetry/ws?topic=${topic}`;
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
        setTimeout(() => {
            startWebSocket(topic, channel);
        }, 5000);
    });
}