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