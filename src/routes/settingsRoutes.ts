import express from 'express';
import { getHours, updateHours, getSetting, updateSetting } from '../controllers/settingsController';

const router = express.Router();

router.get('/hours', getHours);
router.put('/hours', updateHours);

router.get('/:key', getSetting);
router.put('/:key', updateSetting);

export default router;