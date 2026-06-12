const { db } = require('../config/firebase');

const addToCart = async (userId, product) => {
    const cartRef = db().collection('Carts').doc(userId);
    const cartDoc = await cartRef.get();
    
    let items = [];
    if (cartDoc.exists) {
        items = cartDoc.data().items || [];
    }

    const existingItemIndex = items.findIndex(item => item.productId === product.productId);
    
    if (existingItemIndex > -1) {
        items[existingItemIndex].quantity += parseInt(product.quantity || 1);
    } else {
        items.push({
            ...product,
            quantity: parseInt(product.quantity || 1),
            addedAt: Date.now()
        });
    }

    await cartRef.set({ items, updatedAt: Date.now() });
    return items;
};

const getCart = async (userId) => {
    const cartDoc = await db().collection('Carts').doc(userId).get();
    if (!cartDoc.exists) {
        return [];
    }
    return cartDoc.data().items || [];
};

const removeFromCart = async (userId, productId) => {
    const cartRef = db().collection('Carts').doc(userId);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) return [];

    let items = cartDoc.data().items || [];
    items = items.filter(item => item.productId !== productId);
    
    await cartRef.set({ items, updatedAt: Date.now() });
    return items;
};

const updateCartItemQuantity = async (userId, productId, quantity) => {
    const cartRef = db().collection('Carts').doc(userId);
    const cartDoc = await cartRef.get();
    
    if (!cartDoc.exists) return [];

    let items = cartDoc.data().items || [];
    const itemIndex = items.findIndex(item => item.productId === productId);
    
    if (itemIndex > -1) {
        items[itemIndex].quantity = parseInt(quantity);
        await cartRef.set({ items, updatedAt: Date.now() });
    }
    
    return items;
};

const clearCart = async (userId) => {
    const cartRef = db().collection('Carts').doc(userId);
    await cartRef.set({ items: [], updatedAt: Date.now() });
    return [];
};

module.exports = {
    addToCart,
    getCart,
    removeFromCart,
    updateCartItemQuantity,
    clearCart
};
