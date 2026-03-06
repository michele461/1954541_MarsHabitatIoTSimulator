import { startRestPoller } from './poller';
import { startTelemetryStreamer } from './streamer';

console.log("Starting the Ingestion Service...");

// Start both the REST polling and Telemetry streaming processes
startRestPoller();
startTelemetryStreamer();