// Modules
const router = require('express').Router();
const logger = require('../logger/logger');

const inv_solar_systems = require('../models/inv_solar_systems');

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

// common DB functions
var all_solar_system_data;

async function findSolarSystemData() {                      // read solar system and region data 
    const all_solar_systems_data = await inv_solar_systems.aggregate([
        { $lookup: { "from": "inv_regions", "localField": "region_id", "foreignField": "id", "as": "region" } },    // add region data to solar system (inv_solar_systems <- inv_regions)
        { $unwind: "$region" },                                                                                     // unwind the nested array region : [{...,...,...}] -> {...,...,...}
        { $project : { "id" : 1 , "name" : 1, "region_id" : 1, "region_name" : "$region.name" } }                   // define the output fields (sys_id, sys_name, region_id, region_name)
    ]);
    return all_solar_systems_data;
}

// read solar system data from DB
findSolarSystemData().then((solar_system_data) => {
    all_solar_system_data = solar_system_data;
});

// helper to get SystemID
function getSystemIDFromName(name){
    const system_found = all_solar_system_data.find(function (data) {
        if (data.name == name){
            return data.id;
        } 
    });
    return system_found.id;
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

router.post('/api/add', (req, res) => {
    const msgObject = {
        method: req.method,
        url: req.originalUrl,
        res_status: res.statusCode,
    };
    logger.http.log('info', JSON.stringify(msgObject));

    

    const msg_id = req.body.id;
    const type = req.body.type;
    const name = req.body.systemName;
    const sys_id = getSystemIDFromName(name);
    const number = req.body.number;
    const players = req.body.players

    var dateExpire = new Date();
    dateExpire.setMinutes(dateExpire.getMinutes() + 5);
    
    res.json({
        recievedRequest: req.body,
        messageID: msg_id,
        messageType: type,
        createdMessage: {
            "id": sys_id,
            "system": name,
            "type": "enemy",
            "number": number,
            "loc": '', 
            "comment": players, 
            "shiptype" : {
                "u": 0,
                "f": 0,
                "d": 0,
                "c": 0,
                "bc": 0,
                "bs": 0,
                "i": 0
            },
            "gatecamp": false,
            "stationcamp": false,
            "bubble": false,
            "dateExpire": dateExpire,
            "discordId": 'deine BOT ID',
            "avatar": 'deine Avatar ID',
            "username": 'dein BOT Username',
            "discriminator": 'dein Bot Discriminator ID',
            "stars": 500
        }
    });
});

module.exports = router;