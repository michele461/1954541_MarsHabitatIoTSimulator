import * as amqp from 'amqplib';
import { NormalizedEvent } from './types';
import { mockRules } from './mockRules';
import { processEvent } from './engine';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'normalized_events';

async function start() {
  try {
    console.log(`[SYSTEM] Connecting to RabbitMQ at ${RABBITMQ_URL}...`);
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Ensure the queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: false });
    
    console.log(`[SYSTEM] Listening on queue '${QUEUE_NAME}'. Waiting for Martian data...`);

    // Start consuming messages
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const eventString = msg.content.toString();
          const event: NormalizedEvent = JSON.parse(eventString);
          
          // Pass the event and rules to the logic engine
          await processEvent(event, mockRules);
          
          // Acknowledge to RabbitMQ that the message was processed
          channel.ack(msg);
        } catch (error) {
          console.error(`[ERROR] Message processing failed:`, error);
          channel.nack(msg); // Requeue the message in case of error
        }
      }
    });

  } catch (error) {
    console.error('[FATAL ERROR] Unable to start the service:', error);
  }
}

start();