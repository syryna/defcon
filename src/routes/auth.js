// Modules
const router = require('express').Router();
const passport = require('passport');
const logger = require('../logger/logger');

// parent of /auth
router.get('/', passport.authenticate('discord'));

// redirect after login
router.get('/redirect', passport.authenticate('discord', {
    failureRedirect: '/forbidden', // not authenticated
    successRedirect: '/dashboard/overview' // autgenticated
}));

// logout
router.get('/logout', (req, res) => {
    if (req.user) {
        const msgObject = {
            method: req.method,
            url: req.originalUrl,
            discordId: req.user.discordId,
            username: req.user.username,
            discriminator: req.user.discriminator,
            res_status: res.statusCode
        };
        logger.http.log('info', JSON.stringify(msgObject));
        req.logout();
        res.redirect('/');
    } else {
        const msgObject = {
            method: req.method,
            url: req.originalUrl,
            discordId: 'undefined',
            username: 'undefined',
            discriminator: 'undefined',
            res_status: res.statusCode
        };
        logger.http.log('info', JSON.stringify(msgObject));
        res.redirect('/');
    }
});

module.exports = router;