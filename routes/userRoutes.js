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

// Cart & Favorites
router.get('/cart', isAuthenticated, userController.getCartPage);
router.post('/api/cart/add', isAuthenticated, userController.apiAddToCart);
router.delete('/api/cart/remove/:productId', isAuthenticated, userController.apiRemoveFromCart);
router.put('/api/cart/update', isAuthenticated, userController.apiUpdateCartQuantity);
router.post('/api/cart/create-razorpay-order', isAuthenticated, userController.createRazorpayCartOrder);
router.post('/api/cart/verify-payment', isAuthenticated, userController.verifyCartPayment);

router.post('/api/favorites/add', isAuthenticated, userController.apiAddToFavorites);
router.delete('/api/favorites/remove/:productId', isAuthenticated, userController.apiRemoveFromFavorites);

// Razorpay Routes
router.post('/create-razorpay-order', isAuthenticated, userController.createRazorpayOrder);
router.post('/verify-payment', isAuthenticated, userController.verifyPayment);

module.exports = router;
