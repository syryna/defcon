// Modules
const router = require('express').Router();
const logger = require('../logger/logger');

function isAuthorized(req, res, next) {
    if (req.user) {
        next();
    } else {
        res.redirect('/');
    }
}

router.get('/overview', isAuthorized, (req, res) => {
    const msgObject = {
        method: req.method,
        url: req.originalUrl,
        discordId: req.user.discordId,
        username: req.user.username,
        discriminator: req.user.discriminator,
        res_status: res.statusCode
    };
    logger.http.log('info', JSON.stringify(msgObject));
    res.render('overview', {
        username: req.user.username,
        discordId: req.user.discordId,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar,
        guilds: req.user.guilds,
        whitelistAlliance: process.env.DISCORD_ALLIANCE_SERVER_NAME
    });
});

router.get('/region', isAuthorized, (req, res) => {
    const msgObject = {
        method: req.method,
        url: req.originalUrl,
        discordId: req.user.discordId,
        username: req.user.username,
        discriminator: req.user.discriminator,
        res_status: res.statusCode
    };
    logger.http.log('info', JSON.stringify(msgObject));
    res.render('region', {
        username: req.user.username,
        discordId: req.user.discordId,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar,
        guilds: req.user.guilds,
        whitelistAlliance: process.env.DISCORD_ALLIANCE_SERVER_NAME,
        query: req.query.id,
        flavor: req.query.flavor
    });
});

module.exports = router;