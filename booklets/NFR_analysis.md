# Non-Functional Requirements (NFR) Analysis

## 1. Fast UI update based on the in-memory cache (US-01)
The dashboard must display real-time sensor data without latency or heavy continuous queries to a database.
To satisfy this, we decoupled the historical storage from the real-time presentation. The `State API Service` subscribes to the RabbitMQ `telemetry_fanout` exchange and maintains an active in-memory cache (a fast JavaScript Dictionary/Object) of the latest readings. The frontend connects to this service via WebSockets (Socket.io), receiving instant push updates the millisecond a new value is cached, entirely bypassing disk I/O bottlenecks.

## 2. The UI must update the actuator state via REST POST request (US-16)
Manual override of actuators must strictly follow a RESTful approach.
When an operator clicks a toggle button on the React frontend, an asynchronous `POST` request is dispatched directly to the simulator's `/api/actuators/{actuator_name}` endpoint. The UI assumes an optimistic update or awaits the HTTP 200 OK status to reflect the new state, maintaining a strict command-query separation.

## 3. Rules must be saved in a persistent database (US-20)
Automation rules must survive container restarts or service crashes.
While the latest sensor states are kept in ephemeral memory for speed, the automation rules are inherently stateful and critical. We implemented a MongoDB (or PostgreSQL/SQLite based on your final choice) container. The `Automation Engine` reads the rules from this persistent storage at startup and keeps them cached. When the System Administrator creates or deletes a rule via the dashboard, the backend immediately writes the change to the persistent database before updating the execution engine, ensuring zero data loss upon `docker-compose down`.

## 4. The UI must update via WebSocket/Socket.io without refreshing (US-22)
The dashboard must automatically reflect actuator state changes triggered by backend automation rules without requiring a manual page refresh.
To achieve this reactive behavior, when the Automation Engine triggers a rule, it performs two actions: it sends the REST POST command to the simulator, and it simultaneously publishes a state-change/alert message to RabbitMQ. The State API Service consumes this message and broadcasts a Socket.io event to all connected React clients. The frontend listens to this specific WebSocket event and updates its local React state, causing the actuator UI (e.g., a toggle switch or status badge) to re-render instantly and autonomously.