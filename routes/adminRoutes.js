const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Apply admin access control to all routes here
router.use(isAdmin);

router.get('/dashboard', adminController.getDashboard);

router.get('/add-product', adminController.getAddProduct);
router.post('/add-product', upload.single('productImage'), adminController.postAddProduct);

router.get('/manage-products', adminController.getManageProducts);

router.get('/update-product/:id', adminController.getUpdateProduct);
router.post('/update-product/:id', upload.single('productImage'), adminController.postUpdateProduct);

router.post('/delete-product/:id', adminController.getDeleteProduct);

router.get('/view-orders', adminController.getViewOrders);

module.exports = router;
