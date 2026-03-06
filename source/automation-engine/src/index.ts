import amqp from 'amqplib';
import { NormalizedEvent } from './types';
import { mockRules } from './mockRules';
import { processEvent } from './engine';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost';
const QUEUE_NAME = 'normalized_events';

async function start() {
  try {
    console.log(`[SISTEMA] Connessione a RabbitMQ in corso su ${RABBITMQ_URL}...`);
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    // Assicura che la coda esista
    await channel.assertQueue(QUEUE_NAME, { durable: false });
    
    console.log(`[SISTEMA] In ascolto sulla coda '${QUEUE_NAME}'. In attesa di dati marziani...`);

    // Inizia ad ascoltare i messaggi
    channel.consume(QUEUE_NAME, async (msg) => {
      if (msg !== null) {
        try {
          const eventString = msg.content.toString();
          const event: NormalizedEvent = JSON.parse(eventString);
          
          // Passa l'evento e le regole al motore logico
          await processEvent(event, mockRules);
          
          // Conferma a RabbitMQ che il messaggio è stato elaborato
          channel.ack(msg);
        } catch (error) {
          console.error(`[ERRORE] Elaborazione messaggio fallita:`, error);
          channel.nack(msg); // Rimette in coda in caso di errore
        }
      }
    });

  } catch (error) {
    console.error('[ERRORE FATALE] Impossibile avviare il servizio:', error);
  }
}

start();