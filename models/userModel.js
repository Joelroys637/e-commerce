const { db } = require('../config/firebase');
const crypto = require('crypto');

const hashPassword = (password) => {
    return crypto.createHash('sha256').update(password).digest('hex');
};

const createUser = async (name, email, password, location, address, mobileNumber) => {
    const usersRef = db().collection('Users');

    const snapshot = await usersRef.where('email', '==', email).get();
    if (!snapshot.empty) {
        throw new Error('Email already registered.');
    }

    const docRef = usersRef.doc();
    const userId = docRef.id;

    const userData = {
        userId,
        name,
        email,
        password: hashPassword(password),
        location: location || '',
        address: address || '',
        mobileNumber: mobileNumber || '',
        role: 'user'
    };

    await docRef.set(userData);
    return userData;
};

const loginUser = async (email, password) => {
    const usersRef = db().collection('Users');
    const snapshot = await usersRef.where('email', '==', email).get();

    if (snapshot.empty) {
        throw new Error('User not found.');
    }

    let user = null;
    snapshot.forEach(doc => {
        user = doc.data();
    });

    if (user.password !== hashPassword(password)) {
        throw new Error('Incorrect password.');
    }

    return user;
};

const ensureInitialAdmin = async () => {
    const adminEmail = 'admin@example.com';
    const usersRef = db().collection('Users');
    const snapshot = await usersRef.where('email', '==', adminEmail).get();

    if (snapshot.empty) {
        const docRef = usersRef.doc();
        await docRef.set({
            userId: docRef.id,
            name: 'Super Admin',
            email: adminEmail,
            password: hashPassword('admin123'),
            role: 'admin'
        });
        console.log('Created default admin: admin@example.com / admin123');
    }
};

setTimeout(() => {
    try {
        ensureInitialAdmin();
    } catch (e) { }
}, 5000);

module.exports = {
    createUser,
    loginUser
};
