# Mars Habitat IoT - Project Input

## 1. Standard Event Schema
To handle the heterogeneous nature of the sensors provided by the simulator, all incoming payloads (both via REST polling and telemetry streams) will be normalized to the following internal standard format:

```json
{
  "device_id": "string", 
  "timestamp": "ISO-8601 datetime",
  "status": "string (ok | warning)",
  "readings": [
    {
      "metric": "string",
      "value": "number",
      "unit": "string"
    }
  ]
}


//device_id: maps the sensor_id of REST sensors or the telemetry topic
//timestamp: maps captured_at or event_time
//readings: flexible array to support both scalar sensors (a single value) and complex sensors (e.g., particulate or chemistry)