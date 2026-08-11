const express = require('express');
const router = express.Router();
const { getPlatformStats } = require('../controllers/statsController');

router.get('/', getPlatformStats);

module.exports = router;
