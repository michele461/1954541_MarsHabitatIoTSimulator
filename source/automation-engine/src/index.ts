import * as amqp from 'amqplib';
import { NormalizedEvent, Alert } from './types';
import { mockRules } from './mockRules';
import { processEvent } from './engine';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const EXCHANGE_NAME = 'telemetry_fanout';
const QUEUE_NAME = 'brain_queue';
const ALERTS_QUEUE = 'alerts';

async function start() {
  try {
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
          const event: NormalizedEvent = JSON.parse(eventString);
          
          await processEvent(event, mockRules, (alert: Alert) => {
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