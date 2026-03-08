import { mapAirLockLastState } from "common.functions";
import { StandardEvent } from "common.types";

export function normalizeData(rawData: any): StandardEvent | undefined {
    try {
        const readings: StandardEvent['readings'] = [];

        // 1. REST SENSORS (Identified by sensor_id and captured_at)
        if (rawData.sensor_id && rawData.captured_at) {
            const device_id = rawData.sensor_id;
            const timestamp = rawData.captured_at;
            const status = rawData.status || "warning";

            // rest.scalar.v1 (e.g., greenhouse_temperature)
            if (rawData.value !== undefined && rawData.metric !== undefined && rawData.unit !== undefined) {
                readings.push({ metric: rawData.metric, value: rawData.value, unit: rawData.unit });
            }
            // rest.chemistry.v1 (e.g., hydroponic_ph, air_quality_voc)
            else if (rawData.measurements && Array.isArray(rawData.measurements)) {
                for (const m of rawData.measurements) {
                    readings.push({ metric: m.metric, value: m.value, unit: m.unit });
                }
            }
            // rest.particulate.v1 (e.g., air_quality_pm25)
            else if (rawData.pm1_ug_m3 !== undefined && rawData.pm25_ug_m3 !== undefined && rawData.pm10_ug_m3 !== undefined) {
                readings.push({ metric: "pm1", value: rawData.pm1_ug_m3, unit: "ug/m3" });
                readings.push({ metric: "pm25", value: rawData.pm25_ug_m3, unit: "ug/m3" });
                readings.push({ metric: "pm10", value: rawData.pm10_ug_m3, unit: "ug/m3" });
            }
            // rest.level.v1 (e.g., water_tank_level)
            else if (rawData.level_pct !== undefined && rawData.level_liters !== undefined) {
                readings.push({ metric: "level_pct", value: rawData.level_pct, unit: "%" });
                readings.push({ metric: "level_liters", value: rawData.level_liters, unit: "L" });
            }

            return { device_id, timestamp, status, readings };
        }

        // 2. TELEMETRY STREAMS (Identified by topic and event_time)
        if (rawData.topic && rawData.event_time) {
            let device_id = '';
            const timestamp = rawData.event_time;
            const status = rawData.status || "ok";

            // topic.power.v1 (e.g., solar_array, power_bus)
            if (rawData.subsystem !== undefined && rawData.power_kw !== undefined && rawData.voltage_v !== undefined && rawData.current_a !== undefined && rawData.cumulative_kwh !== undefined) {
                device_id = rawData.subsystem;
                readings.push({ metric: "power", value: rawData.power_kw, unit: "kW" });
                readings.push({ metric: "voltage", value: rawData.voltage_v, unit: "V" });
                readings.push({ metric: "current", value: rawData.current_a, unit: "A" });
                readings.push({ metric: "cumulative_energy", value: rawData.cumulative_kwh, unit: "kWh" });
            }
            // topic.environment.v1 (e.g., radiation, life_support)
            else if (rawData.measurements && Array.isArray(rawData.measurements) && rawData.source && rawData.source.system !== undefined && rawData.source.segment !== undefined) {
                device_id = rawData.source.segment + '_' + rawData.source.system;
                for (const m of rawData.measurements) {
                    readings.push({ metric: m.metric, value: m.value, unit: m.unit });
                }
            }
            // topic.thermal_loop.v1 (e.g., thermal_loop)
            else if (rawData.loop !== undefined && rawData.temperature_c !== undefined && rawData.flow_l_min !== undefined) {
                device_id = 'thermal_loop-' + rawData.loop;
                readings.push({ metric: "temperature", value: rawData.temperature_c, unit: "C" });
                readings.push({ metric: "flow", value: rawData.flow_l_min, unit: "L/min" });
            }
            // topic.airlock.v1 (e.g., airlock)
            else if (rawData.airlock_id !== undefined && rawData.cycles_per_hour !== undefined) {
                device_id = rawData.airlock_id;

                readings.push({ metric: "cycles_per_hour", value: rawData.cycles_per_hour, unit: "cycles/h" });

                const stateCode = mapAirLockLastState.enumToNumber(rawData.last_state);
                readings.push({ metric: "airlock_state_code", value: stateCode, unit: "code" });
            }

            return { device_id, timestamp, status, readings };
        }
    } catch (error) {
        console.error("Error during normalization process:", error);
    }
}