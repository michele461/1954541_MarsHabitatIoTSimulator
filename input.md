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

## 2. Rule Model

The automation engine dynamically evaluates simple `IF-THEN` rules upon the arrival of new events. As required by the architectural constraints, these automation rules must be persisted in a database (e.g., PostgreSQL, MongoDB, or an embedded DB like SQLite) to ensure they survive service restarts.

The system supports automation rules following this standard syntax:
`IF [metric] [operator] [value] [unit] THEN set [actuator] to ON | OFF`

Supported operators include: `<`, `<=`, `=`, `>`, `>=`.

Below is the JSON representation of the data model used to store, manage, and evaluate these automation rules within the system:

```json
{
  "rule_id": "uuid-string",          // Unique identifier for the automation rule
  "name": "string",                  // Human-readable rule description (e.g., "Prevent Greenhouse Freezing")
  "condition_metric": "string",      // The unified event metric to evaluate (e.g., "greenhouse_temperature")
  "condition_operator": "string",    // Relational operator: "<", "<=", "=", ">", ">="
  "condition_value": 15.0,           // The numeric threshold required to trigger the rule
  "target_actuator": "string",       // The identifier of the actuator to control (e.g., "habitat_heater")
  "target_state": "string",          // The desired state to apply to the actuator: "ON" or "OFF"
  "is_active": true                  // Boolean flag to easily enable or disable the rule without deleting it
}


//device_id: maps the sensor_id of REST sensors or the telemetry topic
//timestamp: maps captured_at or event_time
//readings: flexible array to support both scalar sensors (a single value) and complex sensors (e.g., particulate or chemistry)