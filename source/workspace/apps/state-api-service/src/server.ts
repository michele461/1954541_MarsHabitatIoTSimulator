import express from 'express';
import http from 'http';
import { setTimeout } from 'timers/promises';
import cors from 'cors';
import MongoDriver from 'driver.mongo';
import RabbitDriver from 'driver.rabbit';
import { Alert, StandardEvent } from 'common.types';
import { ALERTS_QUEUE, EXCHANGE_NAME, RABBITMQ_URL, MONGO_CONFIG } from 'common.constants';
import devicesRouter from './api/devices-api';
import actuatorsRouter from './api/actuators-api';
import automationsRouter from './api/automation-api';


// Global variables 
export const sensorCache: Record<string, StandardEvent> = {};
export let mongoDriver: MongoDriver;


async function startRabbitMQ() {
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
                        sensorCache[key] = event;
                        // io.emit('sensor_update', event); // TODO: da rivedere
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
                    driver.ack(msg);
                    // io.emit('new_alert', alert); // TODO: da rivere
                } catch (err) {
                    console.error(err);
                    driver.nack(msg);
                }
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

async function startServer() {

    try {
        const PORT = process.env.PORT || 3001;

        const app = express();
        app.use(cors());
        app.use(express.json());

        const server = http.createServer(app);

        // TODO: da rivedere
        // const io = new Server(server, { 
        //     cors: { origin: '*' }
        // });

        // io.on('connection', (socket) => {
        //     socket.emit('initial_state', Object.values(sensorCache));
        // });

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
        await startRabbitMQ();
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
