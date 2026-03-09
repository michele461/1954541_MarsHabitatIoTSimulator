import express, { Router } from 'express';
import { AutomationDocument } from 'common.types';
import { mongoDriver } from '../server';

const router: Router = express.Router();

router.get('/api/automation/get', async (req, res) => {
    const data = await mongoDriver.getAllAutomation();
    res.json(({ success: true, data }));
});

router.post('/api/automation/create', async (req, res) => {
    const createReq: Omit<AutomationDocument, "_id"> = req.body;
    try {
        const automation_id = await mongoDriver.create(createReq);
        res.json(({ success: true, automation_id }));
    } catch (error) {
        console.warn(error);
        res.json(({ success: false, error }));
    }
});

router.get('/api/automation/delete/:automation_id', async (req, res) => {
    const automation_id = req.params.automation_id;
    const success = await mongoDriver.delete(automation_id);
    console.log(`[AUTOMATION] Delete ${automation_id} with: ${success ? 'success' : 'error'}`);
    res.json({ success });
});

router.post('/api/automation/update', async (req, res) => {
    const { _id, ...updates } = req.body as AutomationDocument;
    const success = await mongoDriver.updateAutomation(_id, updates);
    res.json({ success });
});

export default router;