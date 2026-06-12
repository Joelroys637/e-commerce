const { db } = require('../config/firebase');

const addBanner = async (bannerData) => {
    const bannersRef = db().collection('Banners');
    const docRef = bannersRef.doc();

    const data = {
        bannerId: docRef.id,
        ...bannerData,
        createdAt: Date.now()
    };
    await docRef.set(data);
    return data;
};

const deleteBanner = async (bannerId) => {
    await db().collection('Banners').doc(bannerId).delete();
};

const getAllBanners = async () => {
    const snapshot = await db().collection('Banners').orderBy('createdAt', 'desc').get();
    const banners = [];
    snapshot.forEach(doc => {
        banners.push(doc.data());
    });
    return banners;
};

const getBannerById = async (bannerId) => {
    const doc = await db().collection('Banners').doc(bannerId).get();
    return doc.exists ? doc.data() : null;
};

module.exports = {
    addBanner,
    deleteBanner,
    getAllBanners,
    getBannerById
};
