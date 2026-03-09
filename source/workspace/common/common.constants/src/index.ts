import { MongoDriverConfig } from "common.types";

export const SIMULATOR_URL: string = process.env.SIMULATOR_URL || 'localhost:8080';
export const RABBITMQ_URL: string = process.env.RABBITMQ_URL || 'amqp://localhost';
export const EXCHANGE_NAME: string = 'telemetry_fanout';
export const ALERTS_QUEUE: string = 'alerts';

export const MONGO_CONFIG: MongoDriverConfig = {
    uri: process.env.MONGO_URL || 'localhost:27017',
    username: process.env.MONGO_USERNAME || 'admin',
    password: process.env.MONGO_PASSWORD || 'admin',
    authSource: 'admin',
    dbName: 'Mars-DB',
    collectionName: 'AutomationCollection'
};