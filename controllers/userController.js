const { getAllProducts, getProductById } = require('../models/productModel');
const { createOrder, getUserOrders } = require('../models/orderModel');
const { getAllBanners } = require('../models/bannerModel');
const { addToCart, getCart, removeFromCart, updateCartItemQuantity, clearCart } = require('../models/cartModel');
const { addToFavorites, getFavorites, removeFromFavorites } = require('../models/favoriteModel');
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
    
    const banners = await getAllBanners();
    res.render('user/home', { products, banners });
};

const getProductListing = async (req, res) => {
    const products = await getAllProducts();
    const categories = [...new Set(products.map(p => p.category))].filter(Boolean);
    res.render('user/productListing', { products, categories });
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

const apiAddToCart = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { productId, quantity } = req.body;
    try {
        const product = await getProductById(productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        product.quantity = quantity || 1;
        await addToCart(req.session.user.id, product);
        res.json({ success: true, message: 'Added to cart' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed to add to cart' });
    }
};

const apiRemoveFromCart = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        await removeFromCart(req.session.user.id, req.params.productId);
        res.json({ success: true, message: 'Removed from cart' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed' });
    }
};

const apiUpdateCartQuantity = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { productId, quantity } = req.body;
    try {
        await updateCartItemQuantity(req.session.user.id, productId, quantity);
        res.json({ success: true });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed' });
    }
};

const apiAddToFavorites = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const { productId } = req.body;
    try {
        const product = await getProductById(productId);
        if (!product) return res.status(404).json({ error: 'Product not found' });
        await addToFavorites(req.session.user.id, product);
        res.json({ success: true, message: 'Added to favorites' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed' });
    }
};

const apiRemoveFromFavorites = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        await removeFromFavorites(req.session.user.id, req.params.productId);
        res.json({ success: true, message: 'Removed from favorites' });
    } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Failed' });
    }
};

const getCartPage = async (req, res) => {
    if (!req.session.user) return res.redirect('/auth/login');
    try {
        const cartItems = await getCart(req.session.user.id);
        const favoriteItems = await getFavorites(req.session.user.id);
        res.render('user/cart', { cartItems, favoriteItems });
    } catch (e) {
        console.error(e);
        res.redirect('/');
    }
};

const createRazorpayCartOrder = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    try {
        const cartItems = await getCart(req.session.user.id);
        if (cartItems.length === 0) return res.status(400).json({ error: 'Cart is empty' });
        
        let totalAmount = 0;
        cartItems.forEach(item => {
            totalAmount += parseFloat(item.price) * parseInt(item.quantity);
        });
        
        const amount = Math.round(totalAmount * 100);
        
        const options = {
            amount: amount,
            currency: "INR",
            receipt: `cart_receipt_${Date.now()}`
        };
        
        const order = await razorpay.orders.create(options);
        res.json({ order, key_id: razorpay.key_id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

const verifyCartPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
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
            
            const cartItems = await getCart(userId);
            
            for (let item of cartItems) {
                const itemTotalPrice = parseFloat(item.price) * parseInt(item.quantity);
                
                await createOrder(userId, item.productId, parseInt(item.quantity), {
                    userName: userData.name,
                    location: userData.location,
                    address: userData.address,
                    mobileNumber: userData.mobileNumber,
                    totalPrice: itemTotalPrice,
                    orderStatus: 'Paid Online'
                });
            }
            
            await clearCart(userId);
            
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
    verifyPayment,
    apiAddToCart,
    apiRemoveFromCart,
    apiUpdateCartQuantity,
    apiAddToFavorites,
    apiRemoveFromFavorites,
    getCartPage,
    createRazorpayCartOrder,
    verifyCartPayment
};
