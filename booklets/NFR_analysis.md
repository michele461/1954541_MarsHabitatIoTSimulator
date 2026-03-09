# Non-Functional Requirements (NFR) Analysis

## 1. Full-duplex WebSocket connections for UI Updates (US-05, US-22)
The UI must update automatically when new telemetry arrives or when an actuator state is modified by an automation rule, without requiring a manual HTTP polling or a page refresh.
We implemented Socket.io to establish a persistent, full-duplex connection between the React frontend and the `State API Service`. The frontend listens to specific WebSocket events and updates its local React state, causing the widgets and actuator UI (e.g., a toggle switch) to re-render instantly and autonomously.

## 2. Strict adherence to StandardEvent schema (US-10)
The system must process all data uniformly regardless of its origin (REST or WebSocket stream).
To achieve this, the `Ingestion Service` acts as an Anti-Corruption Layer. It validates and normalizes all heterogeneous payloads into a strict internal `StandardEvent` schema before publishing them to the RabbitMQ broker. This ensures that downstream microservices (like the Automation Engine) do not need to parse device-specific dialects.

## 3. Non-blocking UI components for Video Feed (US-16)
The real-time surveillance video camera component must not interfere with the critical telemetry data flow.
We utilized React's component-based architecture to isolate the video feed's rendering cycle. By separating the state management of the heavy video component from the high-frequency telemetry widgets, we ensure that the UI thread remains unblocked and data visualization does not degrade.

## 4. Command-Query Separation via Asynchronous REST POST (US-17)
Manual override of actuators by the Habitat Operator must strictly follow a RESTful approach.
When an operator clicks a toggle button on the React frontend, an asynchronous `POST` request is dispatched to the simulator's `/api/actuators/{actuator_name}` endpoint. The UI assumes an optimistic update or awaits the HTTP 200 OK status to reflect the new state, maintaining a strict Command-Query separation.

## 5. Persistent Rule Storage in MongoDB (US-21)
Automation rules are mission-critical and must survive container restarts or service crashes (`docker-compose down`).
While the latest sensor states are kept in ephemeral memory for speed, the rules are stored in a persistent MongoDB database. The `Automation Engine` reads the rules from this persistent storage at startup. When an operator creates or deletes a rule via the dashboard, the backend immediately writes the change to the database, ensuring zero data loss.