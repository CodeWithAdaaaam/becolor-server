"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/routes/serviceRoutes.ts
const express_1 = __importDefault(require("express"));
const serviceController_1 = require("../controllers/serviceController");
const router = express_1.default.Router();
router.get('/', serviceController_1.getServices);
router.post('/', serviceController_1.createService);
router.put('/:id', serviceController_1.updateService);
router.delete('/:id', serviceController_1.deleteService);
exports.default = router;
