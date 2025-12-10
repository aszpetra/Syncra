function isAuthenticated(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    return res.status(401).json({ 
        message: 'Access denied. Please log in to continue.' 
    });
}

module.exports = { isAuthenticated };