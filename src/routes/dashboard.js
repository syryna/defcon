// Modules
const router = require('express').Router();
const logger = require('../logger/logger');

function isAuthorized(req, res, next) {
    if (req.user) {
     
        var part_of_alliance = false;
        for (i in req.user.guilds){ // user in alliance?
            if (req.user.guilds[i].name == process.env.DISCORD_ALLIANCE_SERVER_NAME) {
                part_of_alliance = true;
            }
        }

        if(!req.user.locked && part_of_alliance) {
            next();
        } else {
            req.logout();
            res.redirect('/forbidden');
        }
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
        res_status: res.statusCode,
        type: req.user.type
    };
    logger.http.log('info', JSON.stringify(msgObject));
    res.render('overview', {
        username: req.user.username,
        discordId: req.user.discordId,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar,
        guilds: req.user.guilds,
        type: req.user.type,
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
        res_status: res.statusCode,
        type: req.user.type
    };
    logger.http.log('info', JSON.stringify(msgObject));
    res.render('region', {
        username: req.user.username,
        discordId: req.user.discordId,
        discriminator: req.user.discriminator,
        avatar: req.user.avatar,
        guilds: req.user.guilds,
        type: req.user.type,
        whitelistAlliance: process.env.DISCORD_ALLIANCE_SERVER_NAME,
        query: req.query.id,
        flavor: req.query.flavor
    });
});

module.exports = router;