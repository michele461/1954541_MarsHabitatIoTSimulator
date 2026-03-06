import { processEvent } from './src/engine';
import { mockRules } from './src/mockRules';
import { NormalizedEvent } from './src/types';

// We simulate the JSON that your "Ingestion" teammate should send you
const testEvent: NormalizedEvent = {
  device_id: "greenhouse_temperature",
  timestamp: new Date().toISOString(),
  status: "ok",
  readings: [
    {
      metric: "greenhouse_temperature",
      value: 30.5, // Critical value! The rule says > 28
      unit: "C"
    }
  ]
};

async function runTest() {
  console.log("Starting the Brain test (without RabbitMQ)...");
  
  // Pass the mock event directly to your logic engine
  await processEvent(testEvent, mockRules);
  
  console.log("Test completed!");
}

runTest();