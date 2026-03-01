const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.user) {
        return next();
    }
    return res.redirect('/auth/login');
};

const isAdmin = (req, res, next) => {
    if (req.session && req.session.user && req.session.isAdmin) {
        return next();
    }
    return res.redirect('/auth/login');
};

const isGuest = (req, res, next) => {
    if (req.session && req.session.user) {
        if (req.session.isAdmin) {
            return res.redirect('/admin/dashboard');
        }
        return res.redirect('/');
    }
    return next();
};

module.exports = {
    isAuthenticated,
    isAdmin,
    isGuest
};
