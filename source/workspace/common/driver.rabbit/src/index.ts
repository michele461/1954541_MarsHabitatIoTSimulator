import amqp from 'amqplib';

export class RabbitDriver {
    private channel: amqp.Channel | undefined;
    private uri: string;
    private exchange: string;

    constructor(uri: string, exchange: string) {
        this.uri = uri;
        this.exchange = exchange;
    }

    async connect(): Promise<void> {
        const connection = await amqp.connect(this.uri);
        const channel = await connection.createChannel();
        await channel.assertExchange(this.exchange, 'fanout', { durable: true });
        this.channel = channel;
    }

    async publish(buffer: Buffer<ArrayBufferLike>) {
        if (!this.channel) throw new Error(`RabbitMQ is not connected`);
        return this.channel.publish(this.exchange, '', buffer);
    }

    async assertQueue(queueName: string) {
        if (!this.channel) throw new Error(`RabbitMQ is not connected`);
        return this.channel.assertQueue(queueName, { durable: true });
    }

    async assertAndBindQueue(queueName: string) {
        if (!this.channel) throw new Error(`RabbitMQ is not connected`);
        await this.channel.assertQueue(queueName, { durable: true });
        return this.channel.bindQueue(queueName, this.exchange, '');
    }

    async consume(queueName: string, callback: (msg: amqp.ConsumeMessage | null) => void) {
        if (!this.channel) throw new Error(`RabbitMQ is not connected`);
        this.channel.consume(queueName, callback);
    }

    async ack(message: amqp.Message) {
        if (!this.channel) throw new Error(`RabbitMQ is not connected`);
        return this.channel.ack(message);
    }

    async nack(message: amqp.Message) {
        if (!this.channel) throw new Error(`RabbitMQ is not connected`);
        return this.channel.nack(message);
    }

    async sendToQueue(queueName: string, buffer: Buffer<ArrayBufferLike>) {
        if (!this.channel) throw new Error(`RabbitMQ is not connected`);
        return this.channel.sendToQueue(queueName, buffer);
    }

}

export default RabbitDriver;