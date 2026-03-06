import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import amqp from 'amqplib';
import cors from 'cors';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const sensorCache: Record<string, any> = {};

const io = new Server(server, {
  cors: { origin: '*' }
});

io.on('connection', (socket) => {
  socket.emit('initial_state', Object.values(sensorCache));
});

app.get('/api/state', (req, res) => {
  res.json(Object.values(sensorCache));
});

const RABBIT_URI = process.env.RABBITMQ_URI || 'amqp://localhost';
const EXCHANGE_NAME = 'telemetry_fanout';
const QUEUE_NAME = 'memory_queue';
const ALERTS_QUEUE = 'alerts';

async function startRabbitMQ() {
  try {
    const conn = await amqp.connect(RABBIT_URI);
    const channel = await conn.createChannel();
    
    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    
    await channel.assertQueue(QUEUE_NAME, { durable: true });
    await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

    await channel.assertQueue(ALERTS_QUEUE, { durable: true });

    channel.consume(QUEUE_NAME, (msg) => {
      if (msg !== null) {
        try {
          const event = JSON.parse(msg.content.toString());
          const key = event.device_id; 
          
          if (key) {
            sensorCache[key] = event;
            io.emit('sensor_update', event);
          }
        } catch (err) {
          console.error(err);
        }
        channel.ack(msg);
      }
    });

    channel.consume(ALERTS_QUEUE, (msg) => {
      if (msg !== null) {
        try {
          const alert = JSON.parse(msg.content.toString());
          io.emit('new_alert', alert);
        } catch (err) {
          console.error(err);
        }
        channel.ack(msg);
      }
    });

  } catch (error) {
    setTimeout(startRabbitMQ, 10000); 
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  startRabbitMQ();
});