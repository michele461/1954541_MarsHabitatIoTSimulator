// Interface representing the unified internal event format
export interface StandardEvent {
    device_id: string;
    timestamp: string;
    status: string;
    readings: { metric: string; value: number; unit: string }[];
}

export function normalizeData(rawData: any): StandardEvent | null {
    try {
        const readings: { metric: string; value: number; unit: string }[] = [];

        // 1. REST SENSORS (Identified by sensor_id and captured_at)
        if (rawData.sensor_id && rawData.captured_at) {
            const device_id = rawData.sensor_id;
            const timestamp = rawData.captured_at;
            const status = rawData.status || "ok";

            // rest.scalar.v1 (e.g., greenhouse_temperature)
            if (rawData.value !== undefined && rawData.metric) {
                readings.push({ metric: rawData.metric, value: rawData.value, unit: rawData.unit || "" });
            }
            // rest.chemistry.v1 (e.g., hydroponic_ph, air_quality_voc)
            else if (Array.isArray(rawData.measurements)) {
                for (const m of rawData.measurements) {
                    readings.push({ metric: m.metric, value: m.value, unit: m.unit || "" });
                }
            }
            // rest.particulate.v1 (e.g., air_quality_pm25)
            else if (rawData.pm25_ug_m3 !== undefined) {
                readings.push({ metric: "pm1", value: rawData.pm1_ug_m3, unit: "ug/m3" });
                readings.push({ metric: "pm25", value: rawData.pm25_ug_m3, unit: "ug/m3" });
                readings.push({ metric: "pm10", value: rawData.pm10_ug_m3, unit: "ug/m3" });
            }
            // rest.level.v1 (e.g., water_tank_level)
            else if (rawData.level_pct !== undefined) {
                readings.push({ metric: "level_pct", value: rawData.level_pct, unit: "%" });
                readings.push({ metric: "level_liters", value: rawData.level_liters, unit: "L" });
            }

            return { device_id, timestamp, status, readings };
        }

        // 2. TELEMETRY STREAMS (Identified by topic and event_time)
        if (rawData.topic && rawData.event_time) {
            const device_id = rawData.topic;
            const timestamp = rawData.event_time;
            const status = rawData.status || "ok";

            // topic.power.v1 (e.g., solar_array, power_bus)
            if (rawData.power_kw !== undefined) {
                readings.push({ metric: "power", value: rawData.power_kw, unit: "kW" });
                readings.push({ metric: "voltage", value: rawData.voltage_v, unit: "V" });
                readings.push({ metric: "current", value: rawData.current_a, unit: "A" });
                readings.push({ metric: "cumulative_energy", value: rawData.cumulative_kwh, unit: "kWh" });
            }
            // topic.environment.v1 (e.g., radiation, life_support)
            else if (Array.isArray(rawData.measurements)) {
                for (const m of rawData.measurements) {
                    readings.push({ metric: m.metric, value: m.value, unit: m.unit || "" });
                }
            }
            // topic.thermal_loop.v1 (e.g., thermal_loop)
            else if (rawData.temperature_c !== undefined) {
                readings.push({ metric: "temperature", value: rawData.temperature_c, unit: "C" });
                readings.push({ metric: "flow", value: rawData.flow_l_min, unit: "L/min" });
            }
            // topic.airlock.v1 (e.g., airlock)
            else if (rawData.cycles_per_hour !== undefined) {
                readings.push({ metric: "cycles_per_hour", value: rawData.cycles_per_hour, unit: "cycles/h" });
                
                // Note: The standard schema requires 'value' to be a number. 
                // We map the string states to numeric codes for the rule engine.
                // IDLE = 0, PRESSURIZING = 1, DEPRESSURIZING = -1
                let stateCode = 0;
                if (rawData.last_state === "PRESSURIZING") stateCode = 1;
                if (rawData.last_state === "DEPRESSURIZING") stateCode = -1;
                
                readings.push({ metric: "airlock_state_code", value: stateCode, unit: "code" });
            }

            return { device_id, timestamp, status, readings };
        }

        // If the payload does not match any known contract
        return null; 
        
    } catch (error) {
        console.error("Error during normalization process:", error);
        return null;
    }
}