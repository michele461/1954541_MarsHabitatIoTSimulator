import amqp from 'amqplib';
import { EXCHANGE_NAME, RABBITMQ_URL } from 'common.constants';
import { startRestPoller } from './logic/poller';
import { startTelemetryStreamer } from './logic/streamer';


async function start() {
    console.log("Starting the Ingestion Service...");
    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
        console.log(`Connected to RabbitMQ. Target Exchange: ${EXCHANGE_NAME}`);

        await startRestPoller(channel);
        await startTelemetryStreamer(channel);

        console.log("Ingestion Service started");
    } catch (error) {
        console.error("Error starting the Ingestion Service:", error);
        console.log("Retrying in 5 seconds...");
        setTimeout(start, 5000);
    }
}

start();