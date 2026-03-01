const { createUser, loginUser } = require('../models/userModel');

const getLogin = (req, res) => {
    res.render('user/login', { error: null });
};

const postLogin = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await loginUser(email, password);
        req.session.user = { id: user.userId, email: user.email, name: user.name };

        if (user.role === 'admin') {
            req.session.isAdmin = true;
            return res.redirect('/admin/dashboard');
        }

        res.redirect('/');
    } catch (error) {
        res.render('user/login', { error: error.message });
    }
};

const getRegister = (req, res) => {
    res.render('user/register', { error: null });
};

const postRegister = async (req, res) => {
    const { name, email, password, confirmPassword, location, address, mobileNumber } = req.body;
    if (password !== confirmPassword) {
        return res.render('user/register', { error: 'Passwords do not match.' });
    }

    try {
        const user = await createUser(name, email, password, location, address, mobileNumber);
        req.session.user = { id: user.userId, email: user.email, name: user.name };
        res.redirect('/');
    } catch (error) {
        res.render('user/register', { error: error.message });
    }
};

const getLogout = (req, res) => {
    req.session.destroy(err => {
        res.redirect('/auth/login');
    });
};

module.exports = {
    getLogin,
    postLogin,
    getRegister,
    postRegister,
    getLogout
};
