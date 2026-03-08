import express from 'express';
import http from 'http';
import { setTimeout } from 'timers/promises';
import { Server } from 'socket.io';
import amqp from 'amqplib';
import cors from 'cors';
import { Alert, AutomationDocument, StandardEvent } from 'common.types';
import { ALERTS_QUEUE, EXCHANGE_NAME, RABBITMQ_URL, MONGO_CONFIG } from 'common.constants';
import { getActuatorList, setActuatorState } from 'common.functions';
import MongoDriver from 'driver.mongo';

const QUEUE_NAME: string = 'state-api-service_queue';

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const sensorCache: Record<string, StandardEvent> = {};

let mongoDriver: MongoDriver;

const io = new Server(server, {
    cors: { origin: '*' }
});

io.on('connection', (socket) => {
    socket.emit('initial_state', Object.values(sensorCache));
});

app.get('/api/devices', (req, res) => {
    res.json(({ success: true, data: Object.keys(sensorCache) }));
});
app.get('/api/state', (req, res) => {
    res.json(({ success: true, data: sensorCache }));
});

app.get('/api/state/:device_id', (req, res) => {
    const deviceId = req.params.device_id;
    const data = sensorCache[deviceId];
    if (data) {
        res.json({ success: true, data });
    } else {
        res.status(404).json({ success: false, error: 'Device not found' });
    }
});

// Actuator API
app.get('/api/actuators/get', async (req, res) => {
    const data = await getActuatorList();
    res.json(({ success: true, data }));
});

app.post('/api/actuators/setState', async (req, res) => {
    const { actuator, state } = req.body;
    await setActuatorState(actuator, state);
    res.json({ success: true });
});

// Automation API
app.get('/api/automation/get', async (req, res) => {
    const data = await mongoDriver.getAllAutomation();
    res.json(({ success: true, data }));
});

app.post('/api/automation/create', async (req, res) => {
    const createReq: Omit<AutomationDocument, "_id"> = req.body;
    const automation_id = await mongoDriver.create(createReq);
    res.json(({ success: true, automation_id }));
    res.json({ success: true });
});

app.post('/api/automation/update', async (req, res) => {
    const {id, updates} = req.body as {id: string, updates: Partial<AutomationDocument>};
    const success = await mongoDriver.updateAutomation(id, updates);
    res.json({ success });
});

app.get('/api/automation/delete/:automation_id', async (req, res) => {
    const automation_id = req.params.automation_id;
    const success = await mongoDriver.delete(automation_id);
    res.json(({ success }));
});

// REST endpoint for health checks
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startRabbitMQ() {
    try {
        const conn = await amqp.connect(RABBITMQ_URL);
        const channel = await conn.createChannel();

        await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

        await channel.assertQueue(QUEUE_NAME, { durable: true });
        await channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, '');

        await channel.assertQueue(ALERTS_QUEUE, { durable: true });

        channel.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                try {
                    const event = JSON.parse(msg.content.toString()) as StandardEvent;
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
                    const alert = JSON.parse(msg.content.toString()) as Alert;
                    io.emit('new_alert', alert);
                } catch (err) {
                    console.error(err);
                }
                channel.ack(msg);
            }
        });

    } catch (error) {
        await setTimeout(5000);
        return startRabbitMQ();
    }
}

async function startMongoDB() {
    mongoDriver = new MongoDriver(MONGO_CONFIG);
    await mongoDriver.connect();
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    startMongoDB().then(() => console.log(`MongoDB Client started`));
    startRabbitMQ().then(() => console.log(`RabbitMQ started`));
});