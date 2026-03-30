import { Router } from 'express';
import { 
  getSuppliers, 
  createSupplier, 
  updateSupplier, 
  deleteSupplier, 
  getSupplierById // <--- N'oublie pas d'importer ça
} from '../controllers/supplierController';

const router = Router();

router.get('/', getSuppliers);
router.post('/', createSupplier);
router.get('/:id', getSupplierById); // <--- AJOUTE CETTE LIGNE
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);

export default router;