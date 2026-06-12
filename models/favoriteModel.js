const { db } = require('../config/firebase');

const addToFavorites = async (userId, product) => {
    const favRef = db().collection('Favorites').doc(userId);
    const favDoc = await favRef.get();
    
    let items = [];
    if (favDoc.exists) {
        items = favDoc.data().items || [];
    }

    const existingItemIndex = items.findIndex(item => item.productId === product.productId);
    
    if (existingItemIndex === -1) {
        items.push({
            ...product,
            addedAt: Date.now()
        });
        await favRef.set({ items, updatedAt: Date.now() });
    }

    return items;
};

const getFavorites = async (userId) => {
    const favDoc = await db().collection('Favorites').doc(userId).get();
    if (!favDoc.exists) {
        return [];
    }
    return favDoc.data().items || [];
};

const removeFromFavorites = async (userId, productId) => {
    const favRef = db().collection('Favorites').doc(userId);
    const favDoc = await favRef.get();
    
    if (!favDoc.exists) return [];

    let items = favDoc.data().items || [];
    items = items.filter(item => item.productId !== productId);
    
    await favRef.set({ items, updatedAt: Date.now() });
    return items;
};

module.exports = {
    addToFavorites,
    getFavorites,
    removeFromFavorites
};
