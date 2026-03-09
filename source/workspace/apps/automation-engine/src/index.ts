import { StandardEvent } from 'common.types';
import { processEvent } from './logic/engine';
import { ALERTS_QUEUE, EXCHANGE_NAME, MONGO_CONFIG, RABBITMQ_URL } from 'common.constants';
import { Alert } from 'common.types';
import MongoDriver from 'driver.mongo';
import { RabbitDriver } from 'driver.rabbit';

const QUEUE_NAME: string = 'automation-engine_queue';

async function start() {
    try {
        const mongoDriver = new MongoDriver(MONGO_CONFIG);
        await mongoDriver.connect();
        console.log(`Connected to MongoDB`);

        const driver = new RabbitDriver(RABBITMQ_URL, EXCHANGE_NAME);
        await driver.connect();
        console.log(`Connected to RabbitMQ`);

        await driver.assertAndBindQueue(QUEUE_NAME);
        await driver.assertQueue(ALERTS_QUEUE);

        console.log(`[SYSTEM] Listening on queue '${QUEUE_NAME}'. Waiting for Martian data...`);

        driver.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const eventString = msg.content.toString();
                    const event: StandardEvent = JSON.parse(eventString);

                    await processEvent(event, mongoDriver, (alert: Alert) => {
                        driver.sendToQueue(ALERTS_QUEUE, Buffer.from(JSON.stringify(alert)));
                    });

                    driver.ack(msg);
                } catch (error) {
                    console.error(`[ERROR] Message processing failed:`, error);
                    driver.nack(msg);
                }
            }
        });
    } catch (error) {
        console.error("RabbitMQ not ready for the Brain. Retrying in 5 seconds...");
        setTimeout(start, 5000);
    }
}

start();