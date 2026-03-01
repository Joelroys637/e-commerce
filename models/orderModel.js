const { db } = require('../config/firebase');

const createOrder = async (userId, productId, quantity, orderDetails) => {
    const docRef = db().collection('Orders').doc();

    const orderData = {
        orderId: docRef.id,
        userId,
        productId,
        quantity,
        userName: orderDetails.userName || '',
        location: orderDetails.location || '',
        address: orderDetails.address || '',
        mobileNumber: orderDetails.mobileNumber || '',
        totalPrice: orderDetails.totalPrice || 0,
        orderStatus: 'Placed (COD)',
        timestamp: Date.now()
    };

    await docRef.set(orderData);
    return orderData;
};

const getUserOrders = async (userId) => {
    const snapshot = await db().collection('Orders').where('userId', '==', userId).get();

    const orders = [];
    snapshot.forEach(doc => {
        orders.push(doc.data());
    });

    // Sort by timestamp descending
    return orders.sort((a, b) => b.timestamp - a.timestamp);
};

const getAllOrders = async () => {
    const snapshot = await db().collection('Orders').get();

    const orders = [];
    snapshot.forEach(doc => {
        orders.push(doc.data());
    });

    // Sort by timestamp descending
    return orders.sort((a, b) => b.timestamp - a.timestamp);
};

module.exports = {
    createOrder,
    getUserOrders,
    getAllOrders
};
