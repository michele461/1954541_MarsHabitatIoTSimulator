import express, { Router } from 'express';
import { sensorCache } from '../server';

const router: Router = express.Router();

router.get('/api/devices', (req, res) => {
    res.json(({ success: true, data: Object.keys(sensorCache) }));
});
router.get('/api/state', (req, res) => {
    res.json(({ success: true, data: sensorCache }));
});

router.get('/api/state/:device_id', (req, res) => {
    const deviceId = req.params.device_id;
    const data = sensorCache[deviceId];
    if (data) {
        res.json({ success: true, data });
    } else {
        res.status(404).json({ success: false, error: 'Device not found' });
    }
});

export default router;