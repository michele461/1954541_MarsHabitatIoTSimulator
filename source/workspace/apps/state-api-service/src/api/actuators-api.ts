import express, { Router } from 'express';
import { getActuatorList, setActuatorState } from 'common.functions';

const router: Router = express.Router();

router.get('/api/actuators/get', async (req, res) => {
    const data = await getActuatorList();
    res.json(({ success: true, data }));
});

router.post('/api/actuators/setState', async (req, res) => {
    const { actuator, state } = req.body;
    await setActuatorState(actuator, state);
    res.json({ success: true });
});

export default router;