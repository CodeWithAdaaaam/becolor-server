"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const settingsController_1 = require("../controllers/settingsController");
const router = express_1.default.Router();
router.get('/hours', settingsController_1.getHours);
router.put('/hours', settingsController_1.updateHours);
router.get('/:key', settingsController_1.getSetting);
router.put('/:key', settingsController_1.updateSetting);
exports.default = router;
