const { getAllProducts, getProductById } = require('../models/productModel');
const { createOrder, getUserOrders } = require('../models/orderModel');
const { db } = require('../config/firebase');
const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_SyHdQL7pK1tlnG',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'VsqkM96JJo6haBS40BZnXrnP'
});

const getHome = async (req, res) => {
    const rawProducts = await getAllProducts();
    // Feature top 4 or so on homepage
    const products = rawProducts.slice(0, 4);
    res.render('user/home', { products });
};

const getProductListing = async (req, res) => {
    const products = await getAllProducts();
    res.render('user/productListing', { products });
};

const getProductDetails = async (req, res) => {
    const { id } = req.params;
    const product = await getProductById(id);
    res.render('user/productDetails', { product });
};

const postPlaceOrder = async (req, res) => {
    const { productId, quantity } = req.body;
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    try {
        const userId = req.session.user.id;

        const userDoc = await db().collection('Users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        const product = await getProductById(productId);
        const totalPrice = product ? (parseFloat(product.price) * parseInt(quantity)) : 0;

        await createOrder(userId, productId, parseInt(quantity), {
            userName: userData.name,
            location: userData.location,
            address: userData.address,
            mobileNumber: userData.mobileNumber,
            totalPrice
        });
        res.redirect('/my-orders');
    } catch (error) {
        console.error(error);
        res.redirect('/');
    }
};

const getMyOrders = async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/auth/login');
    }

    const orders = await getUserOrders(req.session.user.id);

    // We need to fetch product info for each order to display name/image
    const enrichedOrders = [];
    for (let order of orders) {
        const prod = await getProductById(order.productId);
        enrichedOrders.push({
            ...order,
            productDetail: prod
        });
    }

    res.render('user/myOrders', { orders: enrichedOrders });
};

const createRazorpayOrder = async (req, res) => {
    const { productId, quantity } = req.body;
    try {
        const product = await getProductById(productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        
        const amount = Math.round(parseFloat(product.price) * parseInt(quantity) * 100);
        
        const options = {
            amount: amount,
            currency: "INR",
            receipt: `receipt_${Date.now()}`
        };
        
        const order = await razorpay.orders.create(options);
        res.json({ order, key_id: razorpay.key_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, productId, quantity } = req.body;
    
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'VsqkM96JJo6haBS40BZnXrnP')
        .update(body.toString())
        .digest('hex');
        
    if (expectedSignature === razorpay_signature) {
        try {
            const userId = req.session.user.id;
            const userDoc = await db().collection('Users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const product = await getProductById(productId);
            const totalPrice = product ? (parseFloat(product.price) * parseInt(quantity)) : 0;
            
            await createOrder(userId, productId, parseInt(quantity), {
                userName: userData.name,
                location: userData.location,
                address: userData.address,
                mobileNumber: userData.mobileNumber,
                totalPrice,
                orderStatus: 'Paid Online'
            });
            
            res.json({ success: true, redirectUrl: '/my-orders' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, error: 'Order creation failed after payment' });
        }
    } else {
        res.status(400).json({ success: false, error: 'Invalid signature' });
    }
};

module.exports = {
    getHome,
    getProductListing,
    getProductDetails,
    postPlaceOrder,
    getMyOrders,
    createRazorpayOrder,
    verifyPayment
};
