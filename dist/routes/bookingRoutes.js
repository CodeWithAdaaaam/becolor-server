"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bookingController_1 = require("../controllers/bookingController");
const router = express_1.default.Router();
// GET /api/booking/slots -> Pour chercher les créneaux
router.get('/slots', bookingController_1.getAvailableSlots);
// POST /api/booking/create -> Pour valider le formulaire
router.post('/create', bookingController_1.createPublicBooking);
exports.default = router;
