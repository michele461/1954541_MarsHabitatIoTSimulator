import * as amqp from 'amqplib';
import { StandardEvent } from 'common.types';
import { processEvent } from './logic/engine';
import { ALERTS_QUEUE, EXCHANGE_NAME, MONGO_CONFIG, RABBITMQ_URL } from 'common.constants';
import { Alert } from 'common.types';
import MongoDriver from 'driver.mongo';

const QUEUE_NAME: string = 'automation-engine_queue';

async function start() {
    try {
        const mongoDriver = new MongoDriver(MONGO_CONFIG);
        await mongoDriver.connect();

        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

        await channel.assertQueue(ALERTS_QUEUE, { durable: true });

        console.log(`[SYSTEM] Listening on queue '${QUEUE_NAME}'. Waiting for Martian data...`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                try {
                    const eventString = msg.content.toString();
                    const event: StandardEvent = JSON.parse(eventString);

                    await processEvent(event, mongoDriver, (alert: Alert) => {
                        channel.sendToQueue(ALERTS_QUEUE, Buffer.from(JSON.stringify(alert)));
                    });

                    channel.ack(msg);
                } catch (error) {
                    console.error(`[ERROR] Message processing failed:`, error);
                    channel.nack(msg);
                }
            }
        });
    } catch (error) {
        console.error("RabbitMQ not ready for the Brain. Retrying in 5 seconds...");
        setTimeout(start, 5000);
    }
}

start();