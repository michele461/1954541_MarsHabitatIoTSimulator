import { EXCHANGE_NAME, RABBITMQ_URL } from 'common.constants';
import { startRestPoller } from './logic/poller';
import { startTelemetryStreamer } from './logic/streamer';
import RabbitDriver from 'driver.rabbit';

async function start() {
    console.log("Starting the Ingestion Service...");
    try {
        const driver = new RabbitDriver(RABBITMQ_URL, EXCHANGE_NAME);
        await driver.connect();
        console.log(`Connected to RabbitMQ`);

        await startRestPoller(driver);
        await startTelemetryStreamer(driver);

        console.log("Ingestion Service started");
    } catch (error) {
        console.error("Error starting the Ingestion Service:", error);
        console.log("Retrying in 5 seconds...");
        setTimeout(start, 5000);
    }
}

start();