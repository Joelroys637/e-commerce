const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { isAuthenticated } = require('../middleware/authMiddleware');

router.get('/', userController.getHome);
router.get('/products', userController.getProductListing);
router.get('/product/:id', userController.getProductDetails);

// Protected routes
router.post('/place-order', isAuthenticated, userController.postPlaceOrder);
router.get('/my-orders', isAuthenticated, userController.getMyOrders);

module.exports = router;
