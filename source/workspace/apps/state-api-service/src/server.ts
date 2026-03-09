import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { setTimeout } from 'timers/promises';
import cors from 'cors';
import MongoDriver from 'driver.mongo';
import RabbitDriver from 'driver.rabbit';
import { Alert, StandardEvent } from 'common.types';
import { ALERTS_QUEUE, EXCHANGE_NAME, RABBITMQ_URL, MONGO_CONFIG } from 'common.constants';
import devicesRouter from './api/devices-api';
import actuatorsRouter from './api/actuators-api';
import automationsRouter from './api/automation-api';
import { getActuatorList } from 'common.functions';


// Global variables 
export const sensorCache: Record<string, StandardEvent> = {};
export let mongoDriver: MongoDriver;


async function startRabbitMQ(io: Server) {
    const QUEUE_NAME: string = 'state-api-service_queue';
    try {
        const driver = new RabbitDriver(RABBITMQ_URL, EXCHANGE_NAME);
        await driver.connect();

        await driver.assertAndBindQueue(QUEUE_NAME);
        await driver.assertQueue(ALERTS_QUEUE);

        driver.consume(QUEUE_NAME, (msg) => {
            if (msg !== null) {
                try {
                    const event = JSON.parse(msg.content.toString()) as StandardEvent;
                    const key = event.device_id;
                    if (key) {
                        if (JSON.stringify(sensorCache[key]) !== JSON.stringify(event)) {
                            sensorCache[key] = event;
                            io.emit('sensor_update', event);
                        }
                    }
                    driver.ack(msg);
                } catch (err) {
                    console.error(err);
                    driver.nack(msg);
                }
            }
        });

        driver.consume(ALERTS_QUEUE, (msg) => {
            if (msg !== null) {
                try {
                    const alert = JSON.parse(msg.content.toString()) as Alert;
                    io.emit('new_alert', alert);
                    driver.ack(msg);
                } catch (err) {
                    console.error(err);
                    driver.nack(msg);
                }
            }
        });

    } catch (error) {
        await setTimeout(5000);
        return startRabbitMQ(io);
    }
}

async function startMongoDB() {
    mongoDriver = new MongoDriver(MONGO_CONFIG);
    await mongoDriver.connect();
}

async function startServer() {

    try {
        const PORT = process.env.PORT || 3001;

        const app = express();
        app.use(cors());
        app.use(express.json());

        const server = http.createServer(app);

        const io = new Server(server, {
            cors: { origin: '*' }
        });

        io.on('connection', async (socket) => {
            socket.emit('initial_state', sensorCache);
            const actuators = await getActuatorList();
            socket.emit('initial_actuator', actuators);
            const automations = await mongoDriver.getAllAutomation();
            socket.emit('initial_automation', automations);
        });

        // Serve static files from dashboard
        const dashboardPath = path.join(__dirname, '../../dashboard/dist');
        app.use(express.static(dashboardPath));

        // Serve index.html for all other routes (SPA support)
        app.get('/', (req, res) => {
            res.sendFile(path.join(dashboardPath, 'index.html'));
        });

        // REST endpoint for health checks
        app.get('/api/health', (req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // Others REST api
        app.use(devicesRouter);
        app.use(actuatorsRouter);
        app.use(automationsRouter);

        await startMongoDB();
        console.log(`MongoDB Client started`)
        await startRabbitMQ(io);
        console.log(`RabbitMQ started`)

        server.listen(PORT, () => {
            console.log('Server started');
        })
    } catch (err) {
        console.error(`Error during the start of the server:`, err);
        await setTimeout(5000);
        return startServer();
    }
}

startServer();
