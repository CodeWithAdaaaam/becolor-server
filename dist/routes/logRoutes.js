"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const logController_1 = require("../controllers/logController");
const router = (0, express_1.Router)();
// GET /api/logs - Get all logs
router.get('/', logController_1.getLogs);
exports.default = router;
