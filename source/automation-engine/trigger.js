const amqp = require('amqplib');

async function fireFakeAlert() {
  const RABBIT_URL = 'amqp://localhost';
  const EXCHANGE_NAME = 'telemetry_fanout';

  try {
    const connection = await amqp.connect(RABBIT_URL);
    const channel = await connection.createChannel();
    
    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });

    const fakeAlert = {
      device_id: "greenhouse_temperature",
      timestamp: new Date().toISOString(),
      status: "ok",
      readings: [
        { metric: "greenhouse_temperature", value: 30.0, unit: "C" }
      ]
    };

    channel.publish(EXCHANGE_NAME, '', Buffer.from(JSON.stringify(fakeAlert)));
    console.log("Data sent to Fanout Exchange!");

    setTimeout(() => {
      connection.close();
      process.exit(0);
    }, 500);
  } catch (err) {
    console.error(err);
  }
}

fireFakeAlert();