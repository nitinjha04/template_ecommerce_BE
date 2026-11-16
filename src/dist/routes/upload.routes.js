"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const upload_controller_1 = require("../controllers/upload.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate, (0, auth_middleware_1.authorize)('admin'));
router.post('/single', upload_middleware_1.upload.single('image'), upload_controller_1.UploadController.uploadSingle);
router.post('/multiple', upload_middleware_1.upload.array('images', 10), upload_controller_1.UploadController.uploadMultiple);
exports.default = router;
//# sourceMappingURL=upload.routes.js.map