const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isGuest } = require('../middleware/authMiddleware');

router.get('/login', isGuest, authController.getLogin);
router.post('/login', isGuest, authController.postLogin);

router.get('/register', isGuest, authController.getRegister);
router.post('/register', isGuest, authController.postRegister);

router.get('/logout', authController.getLogout);

module.exports = router;
