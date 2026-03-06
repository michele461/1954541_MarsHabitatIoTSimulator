import { processEvent } from './src/engine';
import { mockRules } from './src/mockRules';
import { NormalizedEvent } from './src/types';

// Simuliamo il JSON che il tuo compagno "Raccoglitore" dovrebbe inviarti
const testEvent: NormalizedEvent = {
  device_id: "greenhouse_temperature",
  timestamp: new Date().toISOString(),
  status: "ok",
  readings: [
    {
      metric: "greenhouse_temperature",
      value: 30.5, // 🔴 Valore critico! La regola dice > 28
      unit: "C"
    }
  ]
};

async function runTest() {
  console.log("🚀 Avvio test del Cervello (senza RabbitMQ)...");
  
  // Passiamo il finto evento direttamente al tuo motore logico
  await processEvent(testEvent, mockRules);
  
  console.log("✅ Test completato!");
}

runTest();