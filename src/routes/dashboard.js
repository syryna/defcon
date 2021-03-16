// Modules
const router = require('express').Router();
const logger = require('../logger/logger');
const mongoose = require('mongoose');
var io = require('socket.io-client');

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

// add a socket client to send messages from API via socket to server
const PORT = process.env.PORT || 3001;
if(process.env.ENV == 'PROD'){
    var socket = io.connect(`https:/localhost:${PORT}`, {reconnect: true, secure: true});
} else {
    var socket = io.connect(`http://localhost:${PORT}`, {reconnect: true});
}
socket.on('connect', function (socket) {
    console.log('API connected to socket');
});
socket.on('connect_error', function (err) {
    console.log(err);
});


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
    if(typeof system_found === 'undefined') {
        return null;
    } else {
        return system_found.id;
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
    var players = req.body.players

    // validation of input
    var err_count = 0;
    var err_msg ='';
    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(msg_id)){
        err_count++;
        err_msg = err_msg + 'Invalid MongoDB ObjectId: ' + msg_id + '!; ';
    } 
    // validate allowed Type
    if (type !== 'ADD'){
        err_count++;
        err_msg = err_msg + 'Invalid Type: ' + type + '!; ';
    } 
    // validate system id exists
    if (!sys_id){
        err_count++;
        err_msg = err_msg + 'Invalid System: ' + name + '!; ';
    } 
    // validate number 0 or greater
    if (number < 0 || isNaN(number) || !parseInt(number)){
        err_count++;
        err_msg = err_msg + 'Invalid Number, must be 0 or greater and Integer: ' + number + ' (' + typeof number + ')!; ';
    } 
    // validate players not empty
    if ( players.length == 0 ){
        err_count++;
        err_msg = err_msg + 'Invalid Players, must at least contain 1 element: ' + players + ' (' + players.length + ')!; ';
    } 
    // convert players array to comma-seperated list of players
    players = players.join(", ");

    // Output
    if (err_count > 0){
        res.json({
            "error_count": err_count,
            "error_messages": err_msg
        });
    } else {
        var dateExpire = new Date();
        dateExpire.setMinutes(dateExpire.getMinutes() + 5);
        
        const message = {
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
            "discordId": '803379489568587836',
            "avatar": null,
            "username": 'Bot-Test',
            "discriminator": '5589',
            "stars": 500
        }

        res.json(message);

        socket.emit('SAVE_MSG', message, 'Bot-Test');
    }
    
    
});

module.exports = router;