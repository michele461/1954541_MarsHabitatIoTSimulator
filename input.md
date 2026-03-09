# Mars Habitat IoT - Project Input

## 1. System Overview
The system is built as a distributed automation platform using a microservices architecture, strictly separating data ingestion, processing, and presentation. The architecture is entirely event-driven, leveraging a message broker to decouple the components and ensure scalability.

The system consists of the following macro-components:
- **Ingestion Service (Data Collector):** A Node.js/TypeScript service responsible for fetching data from the Mars Simulator. It handles both periodic REST polling for static sensors and WebSocket subscriptions for telemetry streams. It normalizes all heterogeneous data into a unified internal format and publishes the standardized events to the message broker.
- **Message Broker (RabbitMQ):** Acts as the central communication hub. It utilizes a fanout exchange (telemetry_fanout) to broadcast the normalized events simultaneously to multiple consumer queues without creating tight coupling between services.
- **Automation Engine:** A Node.js/TypeScript processing service that subscribes to the broker. It dynamically evaluates incoming events against a set of persisted IF-THEN rules. It implements a "state awareness" memory cache to prevent spamming the simulator with redundant actuator commands. When a rule is triggered, it sends a REST POST request to the simulator to adjust an actuator and publishes an alert back to the broker.
- **State API Service:** A Node.js/Express service that subscribes to the broker to maintain an in-memory cache of the latest state for every sensor. It exposes RESTful APIs (e.g., /api/state/:device_id) for initial data fetching and uses Socket.io to push real-time updates and system alerts to the frontend.
- **Rule Database (MongoDB):** A persistent NoSQL storage used by the Automation Engine to save and load the automation rules, ensuring they survive container restarts.
- **Frontend Dashboard (React):** A web-based UI that consumes the State API to provide real-time monitoring of the habitat, manual control over the actuators, and a graphical interface for rule management.



## 2. User Stories

### 1. Navigation & UI Views (Dashboard)
1. As a Habitat Operator, I want to access a unified main dashboard (`/all`) so that I can see both sensors and telemetry streams together.
2. As a Habitat Operator, I want a dedicated "Sensors" page so that I can filter the view and focus only on internal habitat REST metrics.
3. As a Habitat Operator, I want a dedicated "Telemetry" page so that I can filter the view and focus only on external streams.
4. As a Habitat Operator, I want the dashboard to fetch the initial state upon first connection (via `GET /api/state`) so that I immediately see the current habitat situation without waiting for new events. *(NFR: Fast UI rendering based on the backend's in-memory cache)*
5. As a Habitat Operator, I want the dashboard to receive data updates via WebSocket (Socket.io) so that I do not have to manually refresh the web page to see new values. *(NFR: Data visualization must rely on full-duplex WebSocket connections instead of HTTP polling)*
6. As a Habitat Operator, I want to check the connection with the server from the dashboard via a health status, so that I know if I am really connected.

### 2. Real-time Monitoring & Data Handling
7. As a Habitat Operator, I want to monitor scalar REST sensors (e.g., Temperature, Pressure, Humidity) in real-time so that vital internal parameters are maintained.
8. As a Habitat Operator, I want to view complex multi-metric sensors (e.g., PM 2.5 arrays, VOC chemistry) in unified widgets so that I can easily read grouped data.
9. As a Habitat Operator, I want to monitor high-frequency telemetry streams (e.g., Radiation, Power) so that I can react instantly to external anomalies.
10. As a System Administrator, I want the backend to normalize all heterogeneous REST and Stream payloads into a standard internal event format so that the system processes everything uniformly. *(NFR: Strict architectural adherence to the unified internal StandardEvent schema)*
11. As a System Administrator, I want the State API service to maintain an in-memory cache of the latest readings so that the UI updates fast and without heavy DB queries. *(NFR: Sensor states must be retrievable with sub-millisecond latency to prevent bottlenecks)*

### 3. Manual Actuator Control
12. As a Habitat Operator, I want a dashboard button to manually toggle the `cooling_fan` so that I can force a temperature drop.
13. As a Habitat Operator, I want to be able to manually toggle the `life_support_vent` so that I can correct oxygen levels.
14. As a Habitat Operator, I want to be able to manually toggle the `airlock_shield` so that I can protect the base from radiation.
15. As a Habitat Operator, I want to manually toggle the `heating_unit` so that the temperature does not drop below the survival threshold.
16. As a Habitat Operator, I want to visually monitor the actuators through a real-time surveillance video-camera, so that I know everything is fine. *(NFR: Video feed components must not block or degrade the performance of real-time telemetry UI rendering)*
17. As a System Administrator, I want manual actuator toggles to trigger a REST POST request to the simulator so that the external physical system is updated correctly. *(NFR: The UI must update the actuator state via an asynchronous REST POST request, maintaining Command-Query separation)*

### 4. Rule Management (CRUD)
18. As a Habitat Operator, I want to view a list of all active automation rules via the frontend so that I know what automated controls are governing the base.
19. As a Habitat Operator, I want a frontend form to create a new IF-THEN rule so that the system can adapt to new environmental conditions.
20. As a Habitat Operator, I want to be able to delete an existing rule from the interface so that I can remove obsolete automations.
21. As a System Administrator, I want automation rules to be persisted in a database (MongoDB) so that they survive a system restart. *(NFR: Rules must be saved in a persistent database to survive container crashes or docker-compose down)*

### 5. Automation Execution & Alerts
22. As a Habitat Operator, I want the dashboard to automatically update an actuator's UI toggle when it is modified by an automation so that I see the real-time status without refreshing. *(NFR: The UI must update via WebSocket/Socket.io without refreshing the browser)*
23. As a Habitat Operator, I want to receive real-time alert pop-ups on the dashboard when a rule triggers so that I am immediately notified of the autonomous action.
24. As a System Administrator, I want the Automation Engine to evaluate incoming events dynamically against active rules so that thresholds are monitored constantly.
25. As a System Administrator, I want the Engine to automatically send a POST command to the actuator when a rule triggers so that the habitat reacts autonomously. *(NFR: Action execution must be decoupled and asynchronous to avoid blocking the event consumption loop)*
26. As a System Administrator, I want the Engine to check the current state of an actuator before triggering it so that the system avoids spamming the simulator with redundant commands. *(NFR: The Automation Engine must implement idempotency to prevent redundant network calls)*



## 3. Standard Event Schema
To handle the heterogeneous nature of the sensors provided by the simulator, all incoming payloads (both via REST polling and telemetry streams) will be normalized to the following internal standard format:

```json
{
  "device_id": "string",              // maps the sensor_id of REST sensors or the telemetry topic
  "timestamp": "ISO-8601 datetime",   // maps captured_at or event_time
  "status": "string (ok | warning)",
  "readings": [                       // flexible array to support both scalar sensors (a single value) and complex sensors (e.g., particulate or chemistry)
    {
      "metric": "string",
      "value": "number",
      "unit": "string"
    }
  ]
}
```



## 4. Schema Mapping Details:
- device_id: Maps the sensor_id of REST sensors or the topic name for telemetry streams.
- timestamp: Maps captured_at or event_time.
- readings: A flexible array implemented to support both scalar sensors (a single value) and complex multi-metric sensors (e.g., particulate arrays or chemistry arrays) within the exact same structural signature.



## 5. Rule Model
The automation engine dynamically evaluates simple IF-THEN rules upon the arrival of new events. As required by the architectural constraints, these automation rules must be persisted in a database (e.g., PostgreSQL, MongoDB, or an embedded DB like SQLite) to ensure they survive service restarts.
The system supports automation rules following this standard syntax:`IF [metric] [operator] [value] [unit] THEN set [actuator] to ON | OFF`
Supported operators include: `<`, `<=`, `=`, `>`, `>=`.
Below is the JSON representation of the data model used to store, manage, and evaluate these automation rules within the system:

```json
{
  "rule_id": "uuid-string",          // unique identifier for the automation rule
  "name": "string",
  "condition_metric": "string",      // unified event metric to evaluate (e.g., "temperature_c")
  "condition_operator": "string",
  "condition_value": 15.0,           // numeric threshold required to trigger the rule
  "target_actuator": "string",       // identifier of the actuator to control (e.g., "habitat_heater")
  "target_state": "string",
  "is_active": true
}
```