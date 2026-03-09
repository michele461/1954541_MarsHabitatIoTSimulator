import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    Activity,
    AlertTriangle,
    Droplets,
    Fan,
    FlaskConical,
    Heater,
    Plus,
    Radio,
    Settings2,
    Thermometer,
    Wind,
    Zap
} from 'lucide-react';
import { Alert, AutomationDocument, StandardEvent } from 'common.types';

// Types
type ActuatorData = {
    id: string;
    state: AutomationDocument['actuator_state'];
    name: string;
    icon: React.ReactNode;
};

const SOCKET_URL = 'http://localhost:3001';

type MediaConfig = {
    type: 'video' | 'image';
    src: string;
};

export default function App() {
    const [sensors, setSensors] = useState<Record<string, StandardEvent>>({});
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [connected, setConnected] = useState(false);

    const [actuators, setActuators] = useState<Record<string, ActuatorData>>({});

    const [rules, setRules] = useState<AutomationDocument[]>([]);
    const [newRule, setNewRule] = useState<Partial<AutomationDocument>>({
        operator: '>' as AutomationDocument['operator'],
        actuator_state: 'ON' as AutomationDocument['actuator_state']
    });

    const [hoveredActuator, setHoveredActuator] = useState<string | null>(null);
    const [hoverTimeout, setHoverTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

    const [dataFilter, setDataFilter] = useState<'ALL' | 'SENSORS' | 'TELEMETRY'>('ALL');

    const isTelemetry = (id: string) => {
        const telemetryIds = ['solar_array', 'power_bus', 'radiation', 'life_support', 'thermal_loop', 'airlock'];
        return telemetryIds.some(t => id.includes(t));
    };

    useEffect(() => {
        const socket: Socket = io(SOCKET_URL);

        socket.on('connect', () => {
            setConnected(true);
        });

        socket.on('disconnect', () => {
            setConnected(false);
        });

        socket.on('initial_state', (data: Record<string, StandardEvent>) => {
            setSensors(data);
        });
        socket.on('initial_actuator', (data: Record<string, AutomationDocument['actuator_state']>) => {
            const newActuators: Record<string, ActuatorData> = {};
            for (const actuator of Object.keys(data)) {
                const { name, icon } = getActuatorNameAndIcon(actuator);
                newActuators[actuator] = {
                    id: actuator,
                    state: data[actuator],
                    name,
                    icon
                }
            }
            setActuators(newActuators);
        });
        socket.on('initial_automation', (data: AutomationDocument[]) => {
            setRules(data);
        });

        socket.on('sensor_update', (data: StandardEvent) => {
            setSensors((prev) => ({
                ...prev,
                [data.device_id]: data
            }));
        });

        socket.on('new_alert', (data: Alert) => {
            console.log(`New Alert:`, data);
            const { actuator: id, state } = data;
            const { name, icon } = getActuatorNameAndIcon(id);
            setActuators((prev) => ({
                ...prev,
                [id]: { id, state, name, icon } as ActuatorData
            }));
            setAlerts(prev => [data, ...prev].slice(0, 3)); // Keep last 3 alerts
        });

        return () => {
            if (hoverTimeout) {
                clearTimeout(hoverTimeout);
            }
            socket.disconnect();
        };
    }, []);

    const toggleActuator = async (id: string, currentState: AutomationDocument['actuator_state']) => {
        const newState = currentState === 'ON' ? 'OFF' : 'ON';

        // Optimistic update
        const newActuators = { ...actuators };
        newActuators[id] = { ...newActuators[id], state: newState as AutomationDocument['actuator_state'] };
        setActuators(newActuators);

        try {
            await fetch(`${SOCKET_URL}/api/actuators/setState`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    actuator: id,
                    state: newState
                })
            });
        } catch (error) {
            console.error('Failed to toggle actuator', error);
            // Revert on failure
            newActuators[id] = { ...newActuators[id], state: currentState };
            setActuators(newActuators);
        }
    };

    const handleAddRule = async () => {
        if (newRule.device_id && newRule.device_metric && newRule.operator !== undefined && newRule.value !== undefined && newRule.actuator_id && newRule.actuator_state !== undefined) {
            const rule = newRule;
            try {
                const response = await fetch(`${SOCKET_URL}/api/automation/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(rule)
                });
                const { success, automation_id, error } = await response.json();
                if (!success) throw new Error(`Error response from the server: ` + error);
                if (automation_id) {
                    setRules([...rules, { ...rule, _id: automation_id } as AutomationDocument]);
                    setNewRule({ operator: '>' as AutomationDocument['operator'], actuator_state: 'ON' as AutomationDocument['actuator_state'] }); // Reset form
                } else {
                    throw new Error(`invalid response from the server: ` + JSON.stringify({ success, automation_id }, null, 2))
                }
            } catch (error) {
                console.error('Failed to add the automation rule', error);
            }

        }
    };

    const handleDeleteRule = async (_id: string) => {
        try {
            await fetch(`${SOCKET_URL}/api/automation/delete/${_id}`);
            const newRules: AutomationDocument[] = []
            for (const rule of rules) {
                if (rule._id !== _id) newRules.push(rule);
            }
            setRules(newRules);
        } catch (error) {
            console.error('Failed to delete the automation rule', error);
        }

    };

    const getSensorIcon = (id?: string) => {
        if (id?.includes('solar') || id?.includes('power') || id?.includes('bus')) return <Zap className="text-yellow-400" size={24} />;
        if (id?.includes('co2') || id?.includes('o2') || id?.includes('ph') || id?.includes('voc')) return <FlaskConical className="text-green-400" size={24} />;
        if (id?.includes('temp') || id?.includes('thermal') || id?.includes('radiation') || id?.includes('life_support')) return <Thermometer className="text-red-400" size={24} />;
        if (id?.includes('airlock')) return <Radio className="text-blue-400" size={24} />;
        if (id?.includes('water') || id?.includes('tank')) return <Droplets className="text-blue-300" size={24} />;
        return <Activity className="text-gray-400" size={24} />;
    };

    const getActuatorNameAndIcon = (id: string) => {
        if (id === 'cooling_fan') return { name: 'Cooling Fan', icon: <Fan size={20} /> };
        if (id === 'entrance_humidifier') return { name: 'Entrance Humidifier', icon: <Droplets size={20} /> };
        if (id === 'hall_ventilation') return { name: 'Hall Ventilation', icon: <Wind size={20} /> };
        if (id === 'habitat_heater') return { name: 'Habitat Heater', icon: <Heater size={20} /> };
    };

    const handleDeleteAlert = (alert: Alert) => {
        const newAlerts: Alert[] = [];
        for (const a of alerts) {
            if (JSON.stringify(a) === JSON.stringify(alert)) continue;
            newAlerts.push(a);
        }
        setAlerts(newAlerts);
    }

    const getMediaForActuator = (id: string, state: string): MediaConfig => {
        const normalizedState = (state || '').toUpperCase();

        if (normalizedState === 'UNAVAILABLE') {
            return {
                type: 'video',
                src: '/media/fallback_unavaible.mp4',
            };
        }

        switch (id) {
            case 'cooling_fan':
                return normalizedState === 'ON'
                    ? { type: 'video', src: '/media/cooling_fan_ON.mp4' }
                    : { type: 'image', src: '/media/cooling_fan_OFF.png' };

            case 'habitat_heater':
                return normalizedState === 'ON'
                    ? { type: 'video', src: '/media/habitat_heater_ON.mp4' }
                    : { type: 'image', src: '/media/habitat_heater_OFF.png' };

            case 'entrance_humidifier':
                return normalizedState === 'ON'
                    ? { type: 'video', src: '/media/entrance_humidifier_ON.mp4' }
                    : { type: 'image', src: '/media/entrance_humidifier_OFF.png' };

            case 'hall_ventilation':
                return normalizedState === 'ON'
                    ? { type: 'video', src: '/media/hall_ventilation_ON.mp4' }
                    : { type: 'image', src: '/media/hall_ventilation_OFF.png' };

            default:
                return {
                    type: 'video',
                    src: '/media/fallback_unavaible.mp4',
                };
        }
    };

    const handleActuatorMouseEnter = (actuatorId: string) => {
        const timeout = setTimeout(() => {
            setHoveredActuator(actuatorId);
        }, 1000);

        setHoverTimeout(timeout);
    };

    const handleActuatorMouseLeave = () => {
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            setHoverTimeout(null);
        }
        setHoveredActuator(null);
    };

    return (
        <div className="min-h-screen bg-[var(--color-mars-dark)] text-slate-200 font-mono p-4 md:p-8">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b border-[var(--color-mars-border)] pb-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--color-mars-orange)] tracking-tighter uppercase flex items-center gap-3">
                        <Radio className="animate-pulse" />
                        Ares Base Command
                    </h1>
                    <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest">Habitat Telemetry & Control</p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
                    <span className="text-sm text-slate-400 uppercase tracking-wider">
                        {connected ? 'Uplink Active' : 'Signal Lost'}
                    </span>
                </div>
            </header>

            {/* Alerts Banner */}
            {alerts.length > 0 && (
                <div className="mb-8 space-y-2">
                    {alerts.map((alert: Alert) => (
                        <div key={alert.device_id} className={`p-4 rounded border flex items-start gap-3 'bg-yellow-950/30 border-yellow-500/50 text-yellow-400'`}>
                            <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                            <div className="flex-1">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold uppercase text-sm tracking-wider">Automation Activated</span>
                                    <span className="text-xs opacity-70">{new Date(alert.timestamp).toLocaleTimeString()}</span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between' }}>
                                    <div className="flex-1">
                                        <p className="text-sm mt-1">{alert.message}</p>
                                        <p className="text-sm mt-1">{alert.actuator + ' => ' + alert.state}</p>
                                    </div>
                                    <button
                                        onClick={() => handleDeleteAlert(alert)}
                                        className="text-slate-400 hover:text-red-400 p-2 text-2xl leading-none font-bold"
                                        aria-label="Delete alert"
                                    >
                                        &times;
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex flex-col gap-8">

                {/* Top Section: Data Streams */}
                <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                        <div className="flex items-center gap-2">
                            <Activity className="text-[var(--color-mars-orange)]" size={20} />
                            <h2 className="text-xl font-semibold uppercase tracking-widest text-slate-300">Data Streams</h2>
                        </div>

                        <div className="flex bg-slate-900 rounded-lg p-1 border border-[var(--color-mars-border)]">
                            <button
                                onClick={() => setDataFilter('ALL')}
                                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${dataFilter === 'ALL' ? 'bg-[var(--color-mars-orange-dim)] text-[var(--color-mars-orange)]' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                All
                            </button>
                            <button
                                onClick={() => setDataFilter('SENSORS')}
                                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${dataFilter === 'SENSORS' ? 'bg-[var(--color-mars-orange-dim)] text-[var(--color-mars-orange)]' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Sensors
                            </button>
                            <button
                                onClick={() => setDataFilter('TELEMETRY')}
                                className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded ${dataFilter === 'TELEMETRY' ? 'bg-[var(--color-mars-orange-dim)] text-[var(--color-mars-orange)]' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                Telemetry
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {Object.values(sensors).length === 0 ? (
                            <div className="col-span-full p-8 border border-dashed border-[var(--color-mars-border)] rounded-lg text-center text-slate-500">
                                Awaiting sensor data...
                            </div>
                        ) : (
                            (Object.values(sensors))
                                .filter(sensor => {
                                    if (dataFilter === 'ALL') return true;
                                    if (dataFilter === 'TELEMETRY') return isTelemetry(sensor.device_id);
                                    if (dataFilter === 'SENSORS') return !isTelemetry(sensor.device_id);
                                    return true;
                                })
                                .map(sensor => (
                                    <div key={sensor.device_id} className="bg-[var(--color-mars-surface)] border border-[var(--color-mars-border)] rounded-lg p-5 hover:border-[var(--color-mars-orange-dim)] transition-colors flex flex-col">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="flex flex-col">
                                                <div className="text-xs text-slate-500 uppercase tracking-wider break-all pr-2">
                                                    {sensor.device_id.replace(/_/g, ' ')}
                                                </div>
                                                <div className="text-[10px] text-slate-600 mt-1">
                                                    {new Date(sensor.timestamp).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${sensor.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                                {getSensorIcon(sensor.device_id)}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-3 mt-auto">
                                            {sensor.readings?.map((reading, idx) => (
                                                <div key={idx} className="flex items-baseline justify-between border-t border-[var(--color-mars-border)] pt-2 mt-1 first:border-0 first:pt-0 first:mt-0">
                                                    <span className="text-slate-400 text-xs uppercase tracking-wider">{reading.metric.replace(/_/g, ' ')}</span>
                                                    <div className="flex items-baseline gap-1">
                                                        <span className="text-xl font-bold text-white">{typeof reading.value === 'number' ? reading.value.toFixed(1) : reading.value}</span>
                                                        <span className="text-slate-500 text-xs">{reading.unit}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>

                {/* Bottom Section: Controls & Rules */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Actuators */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Settings2 className="text-[var(--color-mars-orange)]" size={20} />
                            <h2 className="text-xl font-semibold uppercase tracking-widest text-slate-300">Actuators</h2>
                        </div>
                        <div className="space-y-3">
                            {Object.values(actuators).map((actuator, index) => (
                                <div
                                    key={actuator.id}
                                    className="relative bg-[var(--color-mars-surface)] border border-[var(--color-mars-border)] rounded-lg p-4 flex items-center justify-between"
                                    onMouseEnter={() => handleActuatorMouseEnter(actuator.id)}
                                    onMouseLeave={handleActuatorMouseLeave}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded ${actuator.state === 'ON' ? 'bg-[var(--color-mars-orange-dim)] text-[var(--color-mars-orange)]' : 'bg-slate-800 text-slate-500'}`}>
                                            {actuator.icon}
                                        </div>
                                        <div>
                                            <div className="text-sm font-medium text-slate-300">{actuator.name}</div>
                                            <div className="text-xs text-slate-500 uppercase">{actuator.id}</div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => toggleActuator(actuator.id, actuator.state)}
                                        className={`px-4 py-2 rounded font-bold text-xs tracking-wider uppercase transition-all ${actuator.state === 'ON'
                                            ? 'bg-[var(--color-mars-orange)] text-white shadow-[0_0_15px_rgba(255,69,0,0.4)]'
                                            : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                                            }`}
                                    >
                                        {actuator.state}
                                    </button>

                                    {/* VIDEO POPUP (Security Camera Style) */}
                                    {hoveredActuator === actuator.id && (() => {
                                        const media = getMediaForActuator(actuator.id, actuator.state);
                                        const normalizedState = (actuator.state || '').toUpperCase();

                                        return (
                                            <div className="absolute bottom-full right-0 mb-2 z-50 w-64 aspect-video bg-black border border-[var(--color-mars-border)] rounded-lg overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.8)] animate-in fade-in slide-in-from-bottom-2 duration-200">
                                                {/* Camera Overlay UI */}
                                                <div className="absolute top-2 left-2 flex items-center gap-2 z-10">
                                                    <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                                                    <span className="text-[10px] font-mono text-white/90 bg-black/60 px-1.5 py-0.5 rounded">
                                                        CAM-0{index + 1}
                                                    </span>
                                                </div>

                                                <div className="absolute bottom-2 left-2 z-10">
                                                    <span
                                                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${normalizedState === 'ON'
                                                            ? 'text-[var(--color-mars-orange)] bg-black/60'
                                                            : normalizedState === 'UNAVAILABLE'
                                                                ? 'text-red-300 bg-black/60'
                                                                : 'text-slate-400 bg-black/60'
                                                            }`}
                                                    >
                                                        {actuator.state}
                                                    </span>
                                                </div>

                                                {media.type === 'video' ? (
                                                    <video
                                                        src={media.src}
                                                        autoPlay
                                                        loop
                                                        muted
                                                        playsInline
                                                        className="w-full h-full object-cover opacity-80 grayscale contrast-125"
                                                    />
                                                ) : (
                                                    <img
                                                        src={media.src}
                                                        alt={`${actuator.id} ${actuator.state}`}
                                                        className="w-full h-full object-cover opacity-80 grayscale contrast-125"
                                                    />
                                                )}

                                                {/* Scanline Effect */}
                                                <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCI+PC9yZWN0Pgo8bGluZSB4MT0iMCIgeTE9IjAiIHgyPSI0IiB5Mj0iMCIgc3Ryb2tlPSJyZ2JhKDI1NSwyNTUsMjU1LDAuMSkiIHN0cm9rZS13aWR0aD0iMSI+PC9saW5lPgo8L3N2Zz4=')] opacity-30 mix-blend-overlay"></div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Automation Rules */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <Zap className="text-[var(--color-mars-orange)]" size={20} />
                            <h2 className="text-xl font-semibold uppercase tracking-widest text-slate-300">Automation</h2>
                        </div>

                        <div className="bg-[var(--color-mars-surface)] border border-[var(--color-mars-border)] rounded-lg p-4 mb-4">
                            <h3 className="text-xs uppercase tracking-wider text-slate-500 mb-3">New Rule</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-400">IF</span>
                                    <select
                                        aria-label="sensor_id"
                                        className="flex-1 bg-slate-900 border border-[var(--color-mars-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-mars-orange)]"
                                        value={newRule.device_id || ''}
                                        onChange={e => setNewRule({ ...newRule, device_id: e.target.value })}
                                    >
                                        <option value="">Select Sensor...</option>
                                        {Object.values(sensors).map(a => (
                                            <option key={a.device_id} value={a.device_id}>{a.device_id}</option>
                                        ))}
                                    </select>
                                    {newRule.device_id && <>
                                        /
                                        <select
                                            aria-label="sensor_metric"
                                            className="flex-1 bg-slate-900 border border-[var(--color-mars-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-mars-orange)]"
                                            value={newRule.device_metric || ''}
                                            onChange={e => setNewRule({ ...newRule, device_metric: e.target.value })}
                                        >
                                            <option value="">Select Metric...</option>
                                            {Object.values(sensors[newRule.device_id].readings).map(a => (
                                                <option key={a.metric} value={a.metric}>{a.metric}</option>
                                            ))}
                                        </select>
                                    </>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        className="bg-slate-900 border border-[var(--color-mars-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-mars-orange)]"
                                        value={newRule.operator || '>'}
                                        onChange={e => setNewRule({ ...newRule, operator: e.target.value as AutomationDocument['operator'] })}
                                    >
                                        <option value="<">&lt;</option>
                                        <option value="<=">&lt;=</option>
                                        <option value="=">=</option>
                                        <option value=">">&gt;</option>
                                        <option value=">=">&gt;=</option>
                                    </select>
                                    <input
                                        type="number"
                                        placeholder="value"
                                        className="flex-1 bg-slate-900 border border-[var(--color-mars-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-mars-orange)]"
                                        value={newRule.value || ''}
                                        onChange={e => setNewRule({ ...newRule, value: parseFloat(e.target.value) })}
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-slate-400">THEN</span>
                                    <select
                                        className="flex-1 bg-slate-900 border border-[var(--color-mars-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-mars-orange)]"
                                        value={newRule.actuator_id || ''}
                                        onChange={e => setNewRule({ ...newRule, actuator_id: e.target.value })}
                                    >
                                        <option value="">Select Actuator...</option>
                                        {Object.values(actuators).map(a => (
                                            <option key={a.id} value={a.id}>{a.name}</option>
                                        ))}
                                    </select>
                                    <select
                                        className="bg-slate-900 border border-[var(--color-mars-border)] rounded px-2 py-1.5 text-sm focus:outline-none focus:border-[var(--color-mars-orange)]"
                                        value={newRule.actuator_state || 'ON'}
                                        onChange={e => setNewRule({ ...newRule, actuator_state: e.target.value as AutomationDocument['actuator_state'] })}
                                    >
                                        <option value="ON">ON</option>
                                        <option value="OFF">OFF</option>
                                    </select>
                                </div>
                                <button
                                    onClick={handleAddRule}
                                    disabled={!newRule.device_id || !newRule.device_metric || !newRule.actuator_id || !newRule.actuator_state || newRule.value === undefined || newRule.operator === undefined}
                                    className="w-full mt-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-slate-300 py-2 rounded text-sm uppercase tracking-wider font-bold flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Plus size={16} /> Add Rule
                                </button>
                            </div>
                        </div>

                        <div className="space-y-2">
                            {rules.length === 0 ? (
                                <div className="text-center text-slate-600 text-sm py-4 border border-dashed border-[var(--color-mars-border)] rounded">
                                    No active rules
                                </div>
                            ) : (
                                rules.map(rule => (
                                    <div key={rule._id} className="bg-slate-900/50 border border-[var(--color-mars-border)] rounded p-3 text-xs flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-slate-500">IF</span>
                                            <span className="text-blue-400">{rule.device_id}/{rule.device_metric}</span>
                                            <span className="text-slate-300">{rule.operator}</span>
                                            <span className="text-yellow-400">{rule.value}</span>
                                            <span className="text-slate-500">THEN</span>
                                            <span className="text-green-400">{rule.actuator_id}</span>
                                            <span className={rule.actuator_state === 'ON' ? 'text-[var(--color-mars-orange)]' : 'text-slate-500'}>{rule.actuator_state}</span>
                                        </div>
                                        <button
                                            onClick={() => handleDeleteRule(rule._id)}
                                            className="text-slate-400 hover:text-red-400 p-2 text-2xl leading-none font-bold"
                                            aria-label="Delete rule"
                                        >
                                            &times;
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
