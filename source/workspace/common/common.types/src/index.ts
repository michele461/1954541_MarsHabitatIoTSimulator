// Interface representing the unified internal event format
export interface StandardEvent {
    device_id: string;
    timestamp: string;
    status: string;
    readings: { metric: string; value: number; unit: string }[];
}

export interface Alert {
    device_id: string;
    message: string;
    timestamp: string;
    actuator: string;
    state: string;
}

export interface MongoDriverConfig {
    uri: string,
    username: string;
    password: string;
    authSource: string;
    dbName: string;
    collectionName: string;
}

export enum Operator {
    '=' = '=',
    '<' = '<',
    '<=' = '<=',
    '>' = '>',
    '>=' = '>=',
}

export enum State {
    'ON' = 'ON',
    'OFF' = 'OFF'
}

export interface AutomationDocument {
    _id: string,
    is_active: boolean,
    name: string,
    device_id: string,
    device_metric: string,
    operator: Operator,
    value: number,
    actuator_id: string,
    actuator_state: State
}