"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const pincode_controller_1 = require("../controllers/pincode.controller");
const validate_middleware_1 = require("../middleware/validate.middleware");
const router = (0, express_1.Router)();
router.get('/:pin', (0, validate_middleware_1.validate)([
    (0, express_validator_1.param)('pin')
        .matches(/^\d{6}$/)
        .withMessage('PIN must be a 6-digit number'),
]), pincode_controller_1.PincodeController.lookup);
exports.default = router;
