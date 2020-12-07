// Modules
const router = require('express').Router();
const logger = require('../logger/logger');

function isAuthorized(req, res, next) {
    if (req.user) {
        res.redirect('/dashboard/overview');
    } else {
        next();
    }
}

router.get('/', isAuthorized, (req, res) => {
    const msgObject = {
        method: req.method,
        url: req.originalUrl,
        discordId: 'undefined',
        username: 'undefined',
        discriminator: 'undefined',
        res_status: res.statusCode
    };
    logger.http.log('info', JSON.stringify(msgObject));
    res.render('home');
});

module.exports = router;