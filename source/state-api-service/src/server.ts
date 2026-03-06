import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import amqp from 'amqplib';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// 1. LA MEMORIA (In-Memory Caching)
const sensorCache: Record<string, any> = {};

// Configurazione WebSocket per il Frontend
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('🟢 Frontend connesso via WebSocket:', socket.id);
  // Invia lo stato attuale appena qualcuno si connette
  socket.emit('initial_state', Object.values(sensorCache));
});

// Endpoint REST per consultare lo stato
app.get('/api/state', (req, res) => {
  res.json(Object.values(sensorCache));
});

// --- LOGICA RABBITMQ AGGIORNATA ---
const RABBIT_URI = process.env.RABBITMQ_URI || 'amqp://localhost';
const QUEUE_NAME = process.env.QUEUE_NAME || 'normalized_events';

async function startRabbitMQ() {
  try {
    const conn = await amqp.connect(RABBIT_URI);
    const channel = await conn.createChannel();
    
    // Ci assicuriamo che la coda esista
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`🐰 Connesso a RabbitMQ. In ascolto sulla coda: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        try {
          const evento = JSON.parse(msg.content.toString());
          
          // Allineamento con il Ruolo 2: usiamo device_id come chiave univoca
          const key = evento.device_id; 
          
          if (key) {
            // Aggiorna la memoria interna
            sensorCache[key] = evento;
            
            // Notifica il Frontend (test.html) in tempo reale
            io.emit('sensor_update', evento);
            
            console.log(`📦 Messaggio ricevuto da RabbitMQ per: ${key}`);
          } else {
            console.warn('⚠️ Ricevuto messaggio senza device_id da RabbitMQ');
          }
        } catch (err) {
          console.error('⚠️ Errore nel parsing del messaggio RabbitMQ:', err);
        }
        // Conferma la ricezione del messaggio
        channel.ack(msg);
      }
    });

  } catch (error) {
    console.warn('❌ Errore connessione RabbitMQ. Riprovo tra 10 secondi...');
    setTimeout(startRabbitMQ, 10000); 
  }
}

// Avvio del server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 State & API Service (Role 4) avviato sulla porta ${PORT}`);
  startRabbitMQ();
});