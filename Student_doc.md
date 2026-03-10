# SYSTEM DESCRIPTION:

The Ares Base Command is a distributed monitoring and automation system designed to manage a Mars base's life support and environmental parameters. The system collects data from multiple sensors (Temperature, Pressure, CO2, Humidity, etc…) and telemetry streams like Power, Radiation or Airlock status via a REST/WebSocket simulator. It processes this data through a central Message Broker (RabbitMQ), allowing a Rule Engine to trigger automated responses and activate Actuators, and a State Service to provide real-time updates to a web-based Control Dashboard via WebSockets.

# DEPLOYMENT INSTRUCTIONS (HOW TO RUN):

Navigate to the source directory, build the Docker images, and start all the containers. As required, the entire system starts automatically without further manual setup.
  ```bash
  cd source/
  docker compose build
  docker compose up
  ```

# USER STORIES

### 1. Navigation & UI Views (Dashboard)
1. As a Habitat Operator, I want to access a unified main dashboard (`/all`) so that I can see both sensors and telemetry streams together.
2. As a Habitat Operator, I want a dedicated "Sensors" page so that I can filter the view and focus only on internal habitat REST metrics.
3. As a Habitat Operator, I want a dedicated "Telemetry" page so that I can filter the view and focus only on external streams.
4. As a Habitat Operator, I want the dashboard to fetch the initial state upon first connection (via `GET /api/state`) so that I immediately see the current habitat situation without waiting for new events.
5. As a Habitat Operator, I want the dashboard to receive data updates via WebSocket (Socket.io) so that I do not have to manually refresh the web page to see new values. *(NFR: Data visualization must rely on full-duplex WebSocket connections instead of HTTP polling)*
6. As a Habitat Operator, I want to check the connection with the server from the dashboard via a health status, so that I know if I am really connected.

### 2. Real-time Monitoring & Data Handling
7. As a Habitat Operator, I want to monitor scalar REST sensors in real-time so that vital internal parameters are maintained.
8. As a Habitat Operator, I want to view complex multi-metric sensors in unified widgets so that I can easily read grouped data.
9. As a Habitat Operator, I want to monitor high-frequency telemetry streams so that I can react instantly to external anomalies.
10. As a System Administrator, I want the backend to normalize all heterogeneous REST and Stream payloads into a standard internal event format so that the system processes everything uniformly. *(NFR: Strict architectural adherence to the unified internal StandardEvent schema)*
11. As a System Administrator, I want the State API service to maintain an in-memory cache of the latest readings so that the amount of network calls can be reduced.

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
22. As a Habitat Operator, I want the dashboard to automatically update an actuator's UI toggle when it is modified by an automation so that I see the real-time status without refreshing. *(NFR: The UI must update via Socket.io without refreshing the browser)*
23. As a Habitat Operator, I want to receive real-time alert notifications on the dashboard when a rule triggers so that I am immediately notified of the autonomous action.
24. As a Habitat Operator, I want a dedicated notification dropdown menu on the dashboard so that I can review the history of recent alerts.
25. As a Habitat Operator, I want to be able to dismiss individual alerts from the notification panel so that I can keep the interface clean and focus on unresolved issues.
26. As a System Administrator, I want the Automation Engine to evaluate incoming events dynamically against active rules so that thresholds are monitored constantly.
27. As a System Administrator, I want the Engine to automatically send a POST command to the actuator when a rule triggers so that the habitat reacts autonomously.
28. As a System Administrator, I want the Engine to check the current state of an actuator before triggering it so that the system avoids spamming the simulator with redundant commands.

# CONTAINERS & MICROSERVICES:

The system is deployed using a strictly decoupled microservices architecture for the backend logic. Each core domain logic is containerized independently and orchestrated via Docker Compose.

## 1) Ingestion Service Container

### DESCRIPTION:   
The data entry point of the architecture. It connects to the Mars Simulator to fetch raw environmental data, acting as an Anti-Corruption Layer. It handles periodic REST polling for sensors and persistent WebSocket connections for telemetry streams. The service normalizes all heterogeneous payloads into a unified `StandardEvent` format and publishes them to the RabbitMQ fanout exchange.

### PORTS:   
N/A (Operates entirely within the internal Docker network).

### EXTERNAL SERVICES CONNECTIONS:
- Mars IoT Simulator
- RabbitMQ

### SERVICE ARCHITECTURE: 
Event-driven acquisition layer with independent async polling loops and persistent socket listeners. Node.js using Axios for REST, `ws` for WebSocket streams, and `amqplib` for RabbitMQ.

## 2) Automation Engine Container

### DESCRIPTION:   
The decision-making layer. It acts as a consumer on the RabbitMQ message broker. It consumes the normalized events, evaluates them in real-time against the active IF-THEN rules, and checks the current state of actuators to ensure idempotency. If a rule triggers, it sends a REST POST request to the simulator to change the actuator state and publishes an alert back to the broker.

### PORTS:   
N/A (Operates internally).

### EXTERNAL SERVICES CONNECTIONS:
- MongoDB
- RabbitMQ

### SERVICE ARCHITECTURE: 
Reactive Rule Engine implemented in TypeScript. It implements a consume-evaluate-act pattern for every incoming sensor event without blocking the main event loop.

### PERSISTENCE EVALUATION:
Rules are mission-critical. This service connects directly to the MongoDB container to read and persist the active automation rules, ensuring they survive system reboots or container crashes.

- **DB STRUCTURE:** - **db_name:** `Mars-DB`  
    - **collection_name:** `AutomationCollection`   
    - **document_structure:** `{_id: string, device_id: string, device_metric: string, operator: '=' | '<' | '<=' | '>' | '>=', value: number, actuator_id: string, actuator_state: 'ON' | 'OFF'}`

## 3) State API Service & Frontend Dashboard Container

### DESCRIPTION:   
Manages the global habitat state, serves as the backend-for-frontend (BFF), and **statically serves the React Frontend Dashboard**. 
It bridges the asynchronous RabbitMQ messages to the real-time requirements of the dashboard by maintaining an in-memory dictionary of the latest sensor readings and broadcasting updates via Socket.io. It provides REST endpoints for manual actuator overrides and rule management. Furthermore, the Express application is configured to serve the production build of the Vite/React frontend as static files, consolidating both API and UI delivery in a single container.

### PORTS:   
`3001` (Exposed to the host for Frontend UI access, REST API requests, and WebSocket connections).

### EXTERNAL SERVICES CONNECTIONS:
- MongoDB
- RabbitMQ

### SERVICE ARCHITECTURE: 
Stateful API Gateway and Web Server built with Node.js/Express. Uses `socket.io` for full-duplex bidirectional communication and `amqplib` to subscribe to the broker queues. The Express instance intercepts the `/` route to serve `index.html` (SPA support) and statically serves the compiled frontend assets from the `dist` folder.

### ENDPOINTS MAPPING:

| HTTP method | URL | Description | User Stories |
| :---- | :---- | :---- | :---- |
| `GET` | `/api/health` | Performs a health check verifying the connection status of the server | 6 |
| `GET` | `/api/devices` | Retrieves the list of all active device/sensor identifiers | Utility |
| `GET` | `/api/state` | Retrieves all current sensor values from the in-memory cache | 4, 7, 8, 9, 11 |
| `GET` | `/api/state/:device_id`| Retrieves the current cached data for a specific device | 7, 8, 9 |
| `GET` | `/api/actuators/get` | Retrieves the list of all actuators and their current states | UI Init |
| `POST` | `/api/actuators/setState` | Manual command to toggle or set an actuator's state | 12, 13, 14, 15, 17 |
| `GET` | `/api/automation/get` | Retrieves the list of all active automation rules from MongoDB | 18 |
| `POST` | `/api/automation/create` | Creates and persists a new automation IF-THEN rule | 19, 21 |
| `POST` | `/api/automation/update` | Modifies an existing automation rule in the database | Utility |
| `GET` | `/api/automation/delete/:automation_id` | Removes a specific automation rule from the database | 20 |

### FRONTEND

**SERVICE ARCHITECTURE**:

Reactive Component Architecture. A Single Page Application built with React and Tailwind CSS. The UI utilizes a push model where specific widgets re-render automatically when new data packets are received via `socket.io-client`.

**PAGES MAPPING**:
| Route Name | Description | User Stories |
| :---- | :---- | :---- |
| `/all` | Full dashboard access displaying both sensors and telemetry, alongside rule management, actuators, and alert notifications. | 1, 4-26 |
| `/sensors` | Filtered view focusing exclusively on internal REST sensors (excluding telemetry), alongside actuators and rules. | 2, 4-8, 10-26 |
| `/telemetry` | Filtered view focusing exclusively on external telemetry streams (excluding REST sensors), alongside actuators and rules. | 3-6, 9-26 |

# EXTERNAL INFRASTRUCTURE CONTAINERS:
In addition to the custom microservices, the `docker-compose.yml` orchestrates the necessary infrastructure dependencies:
- **Mars Habitat Simulator:** Exposed on port `8080`. Provides the data source (REST `/api/sensors` and WS `/api/telemetry/stream/{topic}`) and the physical actuator targets.
- **RabbitMQ Broker:** Exposed on port `5672`. Acts as the central event bus utilizing a fanout exchange (`telemetry_fanout`) to decouple ingestion from processing.
- **MongoDB:** Exposed on port `27017` Provides persistent NoSQL storage for the automation engine rules.