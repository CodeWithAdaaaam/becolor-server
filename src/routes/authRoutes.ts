import express from 'express';
import { register, login, getStaff, deleteUser, updateUser } from '../controllers/authController';

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/staff', getStaff);
router.delete('/:id', deleteUser); 
router.put('/:id', updateUser);
export default router;