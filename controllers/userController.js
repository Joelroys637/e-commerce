const { getAllProducts, getProductById } = require('../models/productModel');
const { createOrder, getUserOrders } = require('../models/orderModel');
const { db } = require('../config/firebase');

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

module.exports = {
    getHome,
    getProductListing,
    getProductDetails,
    postPlaceOrder,
    getMyOrders
};
