import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import amqp from 'amqplib';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// 1. THE MEMORY (In-Memory Caching)
const sensorCache: Record<string, any> = {};

// WebSocket configuration for the Frontend
const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  console.log('Frontend connected via WebSocket:', socket.id);
  // Send current state as soon as someone connects
  socket.emit('initial_state', Object.values(sensorCache));
});

// REST endpoint to query the state
app.get('/api/state', (req, res) => {
  res.json(Object.values(sensorCache));
});

// --- UPDATED RABBITMQ LOGIC ---
const RABBIT_URI = process.env.RABBITMQ_URI || 'amqp://localhost';
const QUEUE_NAME = process.env.QUEUE_NAME || 'normalized_events';

async function startRabbitMQ() {
  try {
    const conn = await amqp.connect(RABBIT_URI);
    const channel = await conn.createChannel();
    
    // Ensure the queue exists
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    console.log(`Connected to RabbitMQ. Listening on queue: ${QUEUE_NAME}`);

    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        try {
          const event = JSON.parse(msg.content.toString());
          
          // Alignment with Role 2: we use device_id as unique key
          const key = event.device_id; 
          
          if (key) {
            // Update internal memory
            sensorCache[key] = event;
            
            // Notify Frontend (test.html) in real-time
            io.emit('sensor_update', event);
            
            console.log(`Message received from RabbitMQ for: ${key}`);
          } else {
            console.warn('Received message without device_id from RabbitMQ');
          }
        } catch (err) {
          console.error('Error parsing RabbitMQ message:', err);
        }
        // Confirm message reception
        channel.ack(msg);
      }
    });

  } catch (error) {
    console.warn('RabbitMQ connection error. Retrying in 10 seconds...');
    setTimeout(startRabbitMQ, 10000); 
  }
}

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`State & API Service (Role 4) started on port ${PORT}`);
  startRabbitMQ();
});