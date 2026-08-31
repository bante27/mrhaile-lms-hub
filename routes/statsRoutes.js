const express = require('express');
const router = express.Router();
const { getPlatformStats } = require('../controllers/statsController');
const validate = require('../middleware/validateMiddleware');
const { statsQuerySchema } = require('../validation/statsValidation');

router.get('/', validate(statsQuerySchema), getPlatformStats);

module.exports = router;
