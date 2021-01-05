// Modules
const router = require('express').Router();
const logger = require('../logger/logger');

router.get('/', (req, res)  => {
    const msgObject = {
        method: req.method,
        url: req.originalUrl,
        discordId: 'undefined',
        username: 'undefined',
        discriminator: 'undefined',
        res_status: res.statusCode
    };
    logger.http.log('info', JSON.stringify(msgObject));
    res.render('forbidden');
});

module.exports = router;