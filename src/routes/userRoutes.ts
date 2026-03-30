import express from 'express';
import { getAllStaff, 
  getUserSchedule, 
  updateUserSchedule, 
  updateUser, 
  deleteUser } from '../controllers/userController'; // Ajoute les imports

const router = express.Router();

// ... tes autres routes ...

router.get('/', getAllStaff);
router.get('/:id/schedule', getUserSchedule);

router.post('/:id/schedule', updateUserSchedule);

// AJOUTE CES DEUX LIGNES :
router.put('/:id', updateUser); // Pour modifier
router.delete('/:id', deleteUser); // Pour supprimer

export default router;