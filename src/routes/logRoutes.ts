import { Router } from 'express';
import { getLogs } from '../controllers/logController';

const router = Router();

// GET /api/logs - Get all logs
router.get('/', getLogs);

export default router;