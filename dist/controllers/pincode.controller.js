"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PincodeController = void 0;
const pincode_service_1 = require("../services/pincode.service");
const asyncHandler_1 = require("../utils/asyncHandler");
const params_1 = require("../utils/params");
const ApiResponse_1 = require("../views/ApiResponse");
class PincodeController {
    static lookup = (0, asyncHandler_1.asyncHandler)(async (req, res) => {
        const result = await pincode_service_1.PincodeService.lookup((0, params_1.getRouteParam)(req, 'pin'));
        ApiResponse_1.ApiResponse.success(res, result, 'PIN lookup successful');
    });
}
exports.PincodeController = PincodeController;
