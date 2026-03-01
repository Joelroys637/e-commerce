const { db } = require('../config/firebase');

const addProduct = async (productData) => {
    const prodsRef = db().collection('Products');
    const docRef = prodsRef.doc();

    const data = {
        productId: docRef.id,
        ...productData,
        createdAt: Date.now()
    };
    await docRef.set(data);
    return data;
};

const updateProduct = async (productId, updateData) => {
    await db().collection('Products').doc(productId).update(updateData);
};

const deleteProduct = async (productId) => {
    await db().collection('Products').doc(productId).delete();
};

const getAllProducts = async () => {
    const snapshot = await db().collection('Products').orderBy('createdAt', 'desc').get();
    const products = [];
    snapshot.forEach(doc => {
        products.push(doc.data());
    });
    return products;
};

const getProductById = async (productId) => {
    const doc = await db().collection('Products').doc(productId).get();
    return doc.exists ? doc.data() : null;
};

module.exports = {
    addProduct,
    updateProduct,
    deleteProduct,
    getAllProducts,
    getProductById
};
