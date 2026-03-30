"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const userController_1 = require("../controllers/userController"); // Ajoute les imports
const router = express_1.default.Router();
// ... tes autres routes ...
router.get('/', userController_1.getAllStaff);
router.get('/:id/schedule', userController_1.getUserSchedule);
router.post('/:id/schedule', userController_1.updateUserSchedule);
// AJOUTE CES DEUX LIGNES :
router.put('/:id', userController_1.updateUser); // Pour modifier
router.delete('/:id', userController_1.deleteUser); // Pour supprimer
exports.default = router;
