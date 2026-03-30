"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const supplierController_1 = require("../controllers/supplierController");
const router = (0, express_1.Router)();
router.get('/', supplierController_1.getSuppliers);
router.post('/', supplierController_1.createSupplier);
router.get('/:id', supplierController_1.getSupplierById); // <--- AJOUTE CETTE LIGNE
router.put('/:id', supplierController_1.updateSupplier);
router.delete('/:id', supplierController_1.deleteSupplier);
exports.default = router;
