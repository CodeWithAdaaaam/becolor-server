// server/routes/serviceRoutes.ts
import express from 'express';
import { getServices, createService, deleteService,updateService } from '../controllers/serviceController';

const router = express.Router();

router.get('/', getServices);
router.post('/', createService);
router.put('/:id', updateService);
router.delete('/:id', deleteService);

export default router;