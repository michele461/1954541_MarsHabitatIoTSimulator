# SYSTEM DESCRIPTION:

The Ares Base Command is a distributed monitoring and automation system designed to manage a Mars base's life support and environmental parameters. The system collects data from multiple sensors (Temperature, Pressure, CO2, Humidity, etc…) and telemetry streams like Power, Radiation or Airlock status via a REST/WebSocket simulator. It processes this data through a central Message Broker (RabbitMQ), allowing a Rule Engine to trigger automated responses and activate Actuators, and a State Service to provide real-time updates to a web-based Control Dashboard via WebSockets.

# DEPLOYMENT INSTRUCTIONS (HOW TO RUN):

## Required Prerequisites:
- **pnpm** (e.g., version 10.30.3) 
  ```bash
  npm install -g pnpm
  ```
- **Docker** and **Docker Compose**

## How To Build the Code:
Navigate to the workspace directory, install the dependencies, and build the code:
  ```bash
  cd source/workspace/
  pnpm install
  ```

## How to Run the Infrastructure:
Navigate to the source directory, build the Docker images, and start all the containers. As required, the entire system starts automatically without further manual setup.
  ```bash
  cd source/
  docker compose build
  docker compose up
  ```

# User Stories

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

# CONTAINERS:

## 1) Ares Base Command Infrastructure Container

### DESCRIPTION:   
The Ares Base Command Infrastructure Container has the task to provide the data taken from the Mars simulator and normalize them (ingestion service). 
Then, the frontend takes these data every 5 seconds, through a web socket, for the sensor and continuously from the telemetry. This container also provides the automation service which creates the automation rules and stores them inside a MongoDB database. Finally, the frontend will query the database in order to obtain it after a reboot. 

### PORTS:   
3001: State\&Api Service  
5672: RabbitMQ broker

### PERSISTENCE EVALUATION  
The system currently uses In-Memory Persistence via the sensorCache object to provide sub-millisecond access to the latest habitat state. The Automation Engine is designed to integrate with MongoDB for persistent rule storage, currently utilizing mock configurations.

### EXTERNAL SERVICES CONNECTIONS  
Mars Habitat Simulator (REST): Connected on port 8080 for sensor polling (/api/sensors) and actuator commands (/api/actuators/{name}.  
Mars Habitat Simulator (WebSocket): Connected on port 8080 for real-time telemetry streaming (/api/telemetry/stream/{topic})

### MICROSERVICES:

#### MICROSERVICE: ingestion service  
- TYPE: Backend  
- DESCRIPTION: The data entry point. It polls REST sensors, listens to telemetry WebSockets, normalizes raw data into StandardEvent format, and publishes it to a RabbitMQ fanout exchange.  
- PORTS: N/A  
- TECHNOLOGICAL SPECIFICATION: Node.js using Axios for REST, ws for WebSocket streams, and amqplib for RabbitMQ.  
- SERVICE ARCHITECTURE: Event-driven acquisition layer with independent async polling loops and persistent socket listeners.

- ENDPOINTS: N/A

#### MICROSERVICE: automation service  
- TYPE: Backend  
- DESCRIPTION: The decision-making layer. It consumes normalized events, evaluates them against active rules, and triggers simulator actuators via POST requests.  
- PORTS: N/A  
- TECHNOLOGICAL SPECIFICATION: TypeScript logic using amqplib for consumption and Axios for triggering actuator commands.  
- SERVICE ARCHITECTURE: Reactive Rule Engine. Implements a consume-evaluate-act pattern for every incoming sensor event.

- ENDPOINTS: N/A

- DB STRUCTURE:  
    db\_name: Mars-DB  
    collection\_name: AutomationCollection   
    document\_structure: {id: string, device\_id: string,  device\_metric: string, operator:’ \=' | '\<' | '\<=' | '\>' | '\>=', value: number, actuator\_id: string, actuator\_state: 'ON' | 'OFF'}  
    

#### MICROSERVICE: state-api-service  
- TYPE: Backend  
- DESCRIPTION: Manages the global habitat state. It maintains the latest readings in cache and broadcasts real-time updates to the UI.  
- PORTS: 3001  
- TECHNOLOGICAL SPECIFICATION: Node.js/Express server using Socket.io for bidirectional communication and amqplib to subscribe to the event bus.  
- SERVICE ARCHITECTURE: Stateful API Gateway. Bridges asynchronous RabbitMQ messages to the real-time requirements of the frontend.

- ENDPOINTS:

| HTTP method | URL | description | User Stories |
| :---- | :---- | :---- | :---- |
| GET | /api/state | Retrieves all current sensor values from the in-memory cache | 1-15 |
| POST | /api/actuators/toggle | Manual command to change an actuator state (ON/OFF) | 16-19 |
| GET | /api/rules | Retrieves the list of all active automation rules stored in the database | 24 |
| POST | /api/rules | Creates and persists a new automation IF-THEN rule in the database | 20 |
| DELETE | /api/rules/{id} | Removes a specific automation rule from the persistent database | 23 |

- DB STRUCTURE:  
db\_name: Mars-DB  
    collection\_name: AutomationCollection   
    document\_structure: {\_id: string, device\_id: string, device\_metric: string, operator:’ \=' | '\<' | '\<=' | '\>' | '\>=', value: number, actuator\_id: string, actuator\_state: 'ON' | 'OFF'}

## 2) Ares Base Command Frontend Container

### DESCRIPTION:   
The Ares Frontend Container is the user-facing layer of the Ares Base Command system. It provides a real-time graphical interface for monitoring habitat conditions and controlling system actuators. It is used as the primary terminal for mission operators to visualize the data processed by the backend infrastructure.

### USER STORIES: 
1-25

### PORTS: 
5173 default port for the vite/react development server  

### PERSISTENCE EVALUATION:  
There is no data persistence on the frontend level. The application is entirely stateless regarding long-term storage, as it relies on the state-api-service to provide the current habitat state upon connection. Further it operates queering the database for the stored automation rules.

### EXTERNAL SERVICE CONNECTIONS:  
state-api-service: Connected via WebSockets (port 3001\) for live sensor updates and real-time automation alerts.  
state-api-service: Connected via REST (port 3001\) for initial state synchronization using the /api/state endpoint.

### MICROSERVICES:

#### MICROSERVICE: frontend  
- TYPE: Frontend  
- DESCRIPTION: A React-based Single Page Application that permits to see normalized telemetry and sensor data into interactive visual elements such as gauges, charts, and status indicators. Here the operator can also create new automation rules and eventually toggle the actuators.  
- PORTS: 5173  
- TECHNOLOGICAL SPECIFICATION: React framework powered by Vite for fast development and optimized builds. It utilizes socket.io-client for full-duplex communication with the backend and Tailwind CSS for a dark-themed aesthetic.  
- SERVICE ARCHITECTURE: Reactive Component Architecture. The UI utilizes a push model where specific components re-render automatically when the state-api-service broadcasts new data packets via WebSockets.  
- PAGES:

| Name | Description | Related Microservice | User Stories |
| :---- | :---- | :---- | :---- |
| all | full dashboard access with both sensors and telemetry plus the section related to rules creation, rules list and actuators. The Operator has also the possibility to check the alerts | state-api-service | 1-25 |
| sensors | in this case only the sensors can be monitored, with all the other section specified in the “all” page despite telemetry | state-api-service | 1-8, 16-25 |
| telemetry | in this case only the telemetry can be monitored, with all the other section specified in the “all” page despite sensors | state-api-service | 9-25 |