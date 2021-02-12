// Modules
require('dotenv').config();
const https = require('https');
const express = require('express');
const fs = require('fs');
const logger = require('./logger/logger');
const path = require('path');
const mongoose = require('mongoose');
var schedule = require('node-schedule');
const fetch = require('node-fetch');
var bodyParser = require('body-parser');

// My modules
//const import_eveeye = require('./import_eveeye.js');
//const region_o = require('./D3_generate_regions_v2');
//const region_d = require('./D3_generate_regions_details_v2');

// Setup Express
const app = express();
const PORT = process.env.PORT || 3001;

// Setup Auth handling
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const passport = require('passport');
const discordStrategy = require('./strategies/discordstrategy');

// Setup Mongoose connection
const db_connection = require('./database/database');
db_connection.then(() => logger.app.log('info', 'MongoDB - Connected to MongoDB')).catch(err => logger.app.log('error', err));
// Get Mongoose connection
const appDB = mongoose.connection;
appDB.on('error', function (err) {
    logger.app.log('error', err)
});

// Routes
const homeRoute = require('./routes/home');
const authRoute = require('./routes/auth');
const dashboardRoute = require('./routes/dashboard');
const forbiddenRoute = require('./routes/forbidden');

// Body Parser for JSON API
app.use(bodyParser.json());

// Session handling
app.use(session({
    secret: process.env.SESSION_SECRET,
    cookie: {
        maxAge: 60000 * 60 * 24 // one day
    },
    saveUninitialized: false,
    resave: false,
    name: 'discord.oauth2',
    store: new MongoStore({
        mongooseConnection: mongoose.connection
    })
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Passport
app.use(passport.initialize());
app.use(passport.session());

//Middleware Routes
app.use('/', homeRoute);
app.use('/auth', authRoute);
app.use('/dashboard', dashboardRoute);
app.use('/forbidden', forbiddenRoute);

// Express Listener
if(process.env.ENV == 'PROD'){
    server = https.createServer({
        key: fs.readFileSync("./security/key.pem"),
        cert: fs.readFileSync("./security/cert.pem"),
        ca: fs.readFileSync("./security/ca.pem")
    },app).listen(PORT, () => {
        logger.app.log('info', `Express - Express Server listening to requests on port ${PORT}`);
    });
} else {
    server = app.listen(PORT, () => {
        logger.app.log('info', `Express - Express Server listening to requests on port ${PORT}`);
    });
}

// Setup socket.io
var io = require('socket.io')(server);

const messages = require('./models/messages');
const message_activities = require('./models/message_activities');
const inv_solar_systems = require('./models/inv_solar_systems');
const solar_correct = require('./models/inv_solar_correct');
const user_map_settings = require('./models/user_map_settings');
const user_settings = require('./models/user_settings');
const { createConnection } = require('net');

// common DB functions
async function findSolarSystemData() {                      // read solar system and region data 
    const all_solar_systems_data = await inv_solar_systems.aggregate([
        { $lookup: { "from": "inv_regions", "localField": "region_id", "foreignField": "id", "as": "region" } },    // add region data to solar system (inv_solar_systems <- inv_regions)
        { $unwind: "$region" },                                                                                     // unwind the nested array region : [{...,...,...}] -> {...,...,...}
        { $project : { "id" : 1 , "name" : 1, "region_id" : 1, "region_name" : "$region.name" } }                   // define the output fields (sys_id, sys_name, region_id, region_name)
    ]);
    return all_solar_systems_data;
}

async function findMessageData() {                          // reads all active Messages and returns them all
    const message_data = await messages.find(
        { "active": true }
    ).sort(
         [['dateChanged', 'desc']] 
    );
    return message_data;
}

async function findMessageDataForSys(system_id, type) {                          // reads all active Messages for a system and type
    const message_data = await messages.find(
        { 
            "active": true,
            "message.id": system_id,
            "message.type": type
             }
    ).sort(
         [['dateChanged', 'desc']] 
    );
    return message_data;
}

async function findMessageActivityData() {                  // reads all message activities from last 30 min, attaches messages to the activities and returns them all
    var date = new Date();
    date.setMinutes(date.getMinutes() - 30);
    const message_activity_data = await message_activities.aggregate([
        { $match: { "date": { $gte: date } } },
        { $lookup: { "from": "messages", "localField": "message_id", "foreignField": "_id", "as": "msg" } },
        { $unwind: "$msg" }
    ]);
    return message_activity_data;
}

async function createMessage(msg){                          // creates a new message and returns it
    const newMessage = await messages.create({
        "message": msg,
        "active": true,
        "usernameCreated": msg.username,
        "dateCreated": new Date(),
        "usernameChanged": msg.username,
        "dateChanged": new Date()
    });
    const savedMessage = await newMessage.save();
    return savedMessage;
}

async function createMessageActivity(msg_id, username, action) {        // creates a new message activity and returns it
    const newMessageActivity = await message_activities.create({
        "message_id": msg_id,
        "username": username,
        "date": new Date(),
        "action": action
    });
    const savedMessageActivity = await newMessageActivity.save();
    return savedMessageActivity;
}

async function editMessage(msg_id, msg){                                // updates a message and returns returns it
    const updatedMessage = await messages.findByIdAndUpdate(
        { _id: msg_id  }, 
        { $set: { "message": msg, "usernameChanged": msg.username, "dateChanged": new Date() } }
    );
    return updatedMessage
}

async function archieveMessage(msg_id, username){
    const archievedMessage = await messages.findByIdAndUpdate(            // archieves a message and returns returns it
        { _id: msg_id },        
        { $set: { "active": false, "usernameChanged": username, "dateChanged": new Date() } }
    );
    return archievedMessage;
}

async function saveMapSettings(settings){
    const mapSettings = await user_map_settings.findOneAndUpdate(        // save users map settings
        { discordId: settings.discordId, "settings.region": settings.settings.region },        
        { $set: settings },
        { upsert: true, new: true }
    );
    return mapSettings;
}

async function findMapSettings(uid, region) {                          // reads map settings
    const mapSettings = await user_map_settings.find(
        { discordId: uid, "settings.region": region }
    );
    return mapSettings;
}

async function saveUserSettings(settings){
    const userSettings = await user_settings.findOneAndUpdate(        // save users settings
        { discordId: settings.discordId },        
        { $set: settings },
        { upsert: true, new: true }
    );
    return userSettings;
}

async function findUserSettings(uid) {                          // reads user settings
    const userSettings = await user_settings.find(
        { discordId: uid }
    );
    return userSettings;
}

async function increaseStars(uid){
    const userSettings = await user_settings.findOneAndUpdate(        // save users settings
        { discordId: uid },        
        { $inc : {'stars' : 1}}
    );
    return userSettings;
}


// Socket handling
io.on('connection', (socket) => {

    // new socket connected
    logger.app.log('info', `socket.io - socket: ${socket.handshake.query.username} connected`);
    // send all data on initial connect
    findSolarSystemData().then((solar_system_data) => {
        socket.emit('GET_SYS_REG_DATA', solar_system_data);
        logger.app.log('info', `socket.io - [-INIT-]:       ${socket.handshake.query.username} - solar and region data items sens to user`);
    }); 
    findMessageData().then((messages) => {
        var message_history = [];
        if (messages.length == 0) {
            logger.app.log('info', `MongoDB   - [-INIT-]:       ${socket.handshake.query.username} - ${messages.length} records from (messages) read`);
        } else {
            logger.app.log('info', `MongoDB   - [-INIT-]:       ${socket.handshake.query.username} - ${Object.keys(messages).length} records from (messages) read`);
        }
        for (i in messages) {
            message_history.push(messages[i]);
        }
        socket.emit('SEND_MSG_ALL', message_history);
        logger.app.log('info', `socket.io - [-INIT-]:       ${socket.handshake.query.username} - ${messages.length} items from (messages) sent to user`);  
    });
    findMessageActivityData().then((message_activities) => {
        socket.emit('SEND_MSG_ACT_ALL', message_activities); 
        logger.app.log('info', `socket.io - [-INIT-]:       ${socket.handshake.query.username} - ${message_activities.length} items from (messages_activities) sent`);
    }); 
    findMapSettings(socket.handshake.query.uid, socket.handshake.query.region).then((mapSettings) => {
        socket.emit('SEND_MAP_SETTINGS', mapSettings); 
        logger.app.log('info', `socket.io - [-INIT-]:       ${socket.handshake.query.username} - ${mapSettings.length} items from (user_map_settings) sent`);
    }); 
    findUserSettings(socket.handshake.query.uid).then((userSettings) => {
        socket.emit('SEND_USER_SETTINGS', userSettings); 
        logger.app.log('info', `socket.io - [-INIT-]:       ${socket.handshake.query.username} - ${userSettings.length} items from (user_settings) sent`);
    });


    socket.on('COORDS', (msg, type) => {
        if (type = "-100"){ // Admins only
            // var x = (2686.0478560044116-b)/m;
            const x = (msg.x - msg.x_b)/msg.x_m;
            const y = (msg.y - msg.y_b)/msg.y_m;

            async function updateSystemCorrect(msg) {
                updateSystem_msg = await solar_correct.findOneAndUpdate({
                    id: msg.sys_id
                },
                {
                    id: msg.sys_id,
                    coords: {
                        x: x,
                        z: -y
                    },
                    label: msg.label
                }, 
                {
                    upsert: true,
                    new: true
                });
                return updateSystem_msg;
            }

            updateSystemCorrect(msg).then((result) => {
                logger.app.log('info', `MongoDB - inv_solar_corrects - system corrected - ${JSON.stringify(result)}`);
            });
        } 
    });

    // send all active messages to client
    socket.on('GET_MSG_ALL', (username) => {
        findMessageData().then((messages) => {
            var message_history = [];
            if (messages.length == 0) {
                logger.app.log('info', `MongoDB   - [GET ALL]:      ${username} - ${messages.length} records from (messages) read`);
            } else {
                logger.app.log('info', `MongoDB   - [GET ALL]:      ${username} - ${Object.keys(messages).length} records from (messages) read`);
            }
            for (i in messages) {
                message_history.push(messages[i]);
            }
            socket.emit('SEND_MSG_ALL', message_history);
            logger.app.log('info', `socket.io - [SEND ALL]:     ${username} - ${messages.length} items from (messages) sent to user`);  
        });
    });

    // send all messages activities to client
    socket.on('GET_MSG_ACT_ALL', (username) => {
        findMessageActivityData().then((message_activities) => {
            socket.emit('SEND_MSG_ACT_ALL', message_activities); 
            logger.app.log('info', `socket.io - [SEND ACT ALL]: ${username} - ${message_activities.length} items from (messages_activities) sent`);
        }); 
    });

    // store a message and send to all clients
    socket.on('SAVE_MSG', (msg, username) => {
        increaseStars(socket.handshake.query.uid).then(() => {
            logger.app.log('info', `socket.io - [CREATE]:       ${username} - stars in (user_settings) increased`);
            findUserSettings(socket.handshake.query.uid).then((userSettings) => {
                socket.emit('SEND_USER_SETTINGS', userSettings); 
                logger.app.log('info', `socket.io - [CREATE]:       ${socket.handshake.query.username} - ${userSettings.length} items from (user_settings) sent`);
            });
        });
        if (msg.type == "enemy") {
            findMessageDataForSys(msg.id, 'green').then((messages) => {
                for (i in messages) {
                    archieveMessage(messages[i]._id, username).then((archievedMessage) => {
                        logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${archievedMessage._id} saved in (messages)`);
                        createMessageActivity(archievedMessage._id, username, "ARCHIEVED").then((savedMessageActivity) =>{
                            logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                            var MessageActivity = savedMessageActivity.toObject();
                            MessageActivity.msg = archievedMessage;
                        });
                    });
                }
            });
            createMessage(msg, username).then((savedMessage) => {
                logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${savedMessage._id} saved in (messages)`);
                createMessageActivity(savedMessage._id, username, 'CREATED').then((savedMessageActivity) =>{
                    logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                    var MessageActivity = savedMessageActivity.toObject();
                    MessageActivity.msg = savedMessage;
                    // send also to firebase
                    sendFireBaseMsg(msg.system, msg.number, msg.comment)
                    findMessageData().then((messages) => {
                        var message_history = [];
                        if (messages.length == 0) {
                            logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${messages.length} records from (messages) read`);
                        } else {
                            logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${Object.keys(messages).length} records from (messages) read`);
                        }
                        for (i in messages) {
                            message_history.push(messages[i]);
                        }
                        io.emit('SEND_MSG_ALL', message_history);
                        logger.app.log('info', `socket.io - [CREATE]:       ${username} - ${messages.length} items from (messages) sent to all clients`);  
                        findMessageActivityData().then((message_activities) => {
                            io.emit('SEND_MSG_ACT_ALL', message_activities); 
                            logger.app.log('info', `socket.io - [CREATE]:       ${username} - ${message_activities.length} items from (messages_activities) sent to all clients`);
                        });
                    });
                });
            });
        }
        if (msg.type == "green") {
            findMessageDataForSys(msg.id, 'enemy').then((messages) => {
                for (i in messages) {
                    archieveMessage(messages[i]._id, username).then((archievedMessage) => {
                        logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${archievedMessage._id} saved in (messages)`);
                        createMessageActivity(archievedMessage._id, username, "ARCHIEVED").then((savedMessageActivity) =>{
                            logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                            var MessageActivity = savedMessageActivity.toObject();
                            MessageActivity.msg = archievedMessage;
                        });
                    });
                }
            });
            createMessage(msg, username).then((savedMessage) => {
                logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${savedMessage._id} saved in (messages)`);
                createMessageActivity(savedMessage._id, username, 'CREATED').then((savedMessageActivity) =>{
                    logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                    var MessageActivity = savedMessageActivity.toObject();
                    MessageActivity.msg = savedMessage;
                    // send also to firebase
                    sendFireBaseMsg(msg.system, msg.number, "CLEAN SYSTEM")
                    findMessageData().then((messages) => {
                        var message_history = [];
                        if (messages.length == 0) {
                            logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${messages.length} records from (messages) read`);
                        } else {
                            logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${Object.keys(messages).length} records from (messages) read`);
                        }
                        for (i in messages) {
                            message_history.push(messages[i]);
                        }
                        io.emit('SEND_MSG_ALL', message_history);
                        logger.app.log('info', `socket.io - [CREATE]:       ${username} - ${messages.length} items from (messages) sent to all clients`);  
                        findMessageActivityData().then((message_activities) => {
                            io.emit('SEND_MSG_ACT_ALL', message_activities); 
                            logger.app.log('info', `socket.io - [CREATE]:       ${username} - ${message_activities.length} items from (messages_activities) sent to all clients`);
                        });
                    });
                });
            });
        }
    });

    // change a message and send to all clients
    socket.on('EDIT_MSG', (msg_id, msg, username) => {
        increaseStars(socket.handshake.query.uid).then(() => {
            logger.app.log('info', `socket.io - [EDIT]:         ${username} - stars in (user_settings) increased`);
            findUserSettings(socket.handshake.query.uid).then((userSettings) => {
                socket.emit('SEND_USER_SETTINGS', userSettings); 
                logger.app.log('info', `socket.io - [EDIT]:         ${socket.handshake.query.username} - ${userSettings.length} items from (user_settings) sent`);
            });
        });
        editMessage(msg_id, msg, username).then((updatedMessage) => {
            logger.app.log('info', `MongoDB   - [EDIT]:         ${username} - ${updatedMessage._id} modified in (messages)`);
            createMessageActivity(updatedMessage._id, username, "EDITED").then((savedMessageActivity) =>{
                logger.app.log('info', `MongoDB   - [EDIT]:         ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                var MessageActivity = savedMessageActivity.toObject();
                MessageActivity.msg = updatedMessage;
                // send also to firebase
                sendFireBaseMsg(msg.system, msg.number, msg.comment)
                findMessageData().then((messages) => {
                    var message_history = [];
                    if (messages.length == 0) {
                        logger.app.log('info', `MongoDB   - [EDIT]:         ${username} - ${messages.length} records from (messages) read`);
                    } else {
                        logger.app.log('info', `MongoDB   - [EDIT]:         ${username} - ${Object.keys(messages).length} records from (messages) read`);
                    }
                    for (i in messages) {
                        message_history.push(messages[i]);
                    }
                    io.emit('SEND_MSG_ALL', message_history);
                    logger.app.log('info', `socket.io - [EDIT]:         ${username} - ${messages.length} items from (messages) sent to all clients`);  
                    findMessageActivityData().then((message_activities) => {
                        io.emit('SEND_MSG_ACT_ALL', message_activities); 
                        logger.app.log('info', `socket.io - [EDIT]:         ${username} - ${message_activities.length} items from (messages_activities) sent to all clients`);
                    });
                });
            }); 
        });
    });

    // archieve a message and send to all clients
    socket.on('DEL_MSG', (msg_id, username) => {
        increaseStars(socket.handshake.query.uid).then(() => {
            logger.app.log('info', `socket.io - [ARCHIEVE]:     ${username} - stars in (user_settings) increased`);
            findUserSettings(socket.handshake.query.uid).then((userSettings) => {
                socket.emit('SEND_USER_SETTINGS', userSettings); 
                logger.app.log('info', `socket.io - [ARCHIEVE]:     ${socket.handshake.query.username} - ${userSettings.length} items from (user_settings) sent`);
            });
        });
        archieveMessage(msg_id, username).then((archievedMessage) => {
            logger.app.log('info', `MongoDB   - [ARCHIEVE]:     ${username} - ${archievedMessage._id} saved in (messages)`);
            createMessageActivity(archievedMessage._id, username, "ARCHIEVED").then((savedMessageActivity) =>{
                logger.app.log('info', `MongoDB   - [ARCHIEVE]:     ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                var MessageActivity = savedMessageActivity.toObject();
                MessageActivity.msg = archievedMessage;
                findMessageData().then((messages) => {
                    var message_history = [];
                    if (messages.length == 0) {
                        logger.app.log('info', `MongoDB   - [ARCHIEVE]:     ${username} - ${messages.length} records from (messages) read`);
                    } else {
                        logger.app.log('info', `MongoDB   - [ARCHIEVE]:     ${username} - ${Object.keys(messages).length} records from (messages) read`);
                    }
                    for (i in messages) {
                        message_history.push(messages[i]);
                    }
                    io.emit('SEND_MSG_ALL', message_history);
                    logger.app.log('info', `socket.io - [ARCHIEVE]:     ${username} - ${messages.length} items from (messages) sent to all clients`);  
                    findMessageActivityData().then((message_activities) => {
                        io.emit('SEND_MSG_ACT_ALL', message_activities); 
                        logger.app.log('info', `socket.io - [ARCHIEVE]:     ${username} - ${message_activities.length} items from (messages_activities) sent to all clients`);
                    });
                });
            });
        });
    });

    // move a message and send to all clients
    socket.on('MOVE_MSG', (msg_id, msg, username) => {
        increaseStars(socket.handshake.query.uid).then(() => {
            logger.app.log('info', `socket.io - [MOVE]:         ${username} - stars in (user_settings) increased`);
            findUserSettings(socket.handshake.query.uid).then((userSettings) => {
                socket.emit('SEND_USER_SETTINGS', userSettings); 
                logger.app.log('info', `socket.io - [MOVE]:         ${socket.handshake.query.username} - ${userSettings.length} items from (user_settings) sent`);
            });
        });
        archieveMessage(msg_id, username).then((archievedMessage) => {
            logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${archievedMessage._id} saved in (messages)`);
            createMessageActivity(archievedMessage._id, username, "ARCHIEVED").then((savedMessageActivity) =>{
                logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                var MessageActivity = savedMessageActivity.toObject();
                MessageActivity.msg = archievedMessage;
                findMessageDataForSys(msg.id, 'green').then((messages) => {
                    for (i in messages) {
                        archieveMessage(messages[i]._id, username).then((archievedMessage) => {
                            logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${archievedMessage._id} saved in (messages)`);
                            createMessageActivity(archievedMessage._id, username, "ARCHIEVED").then((savedMessageActivity) =>{
                                logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                                var MessageActivity = savedMessageActivity.toObject();
                                MessageActivity.msg = archievedMessage;
                            });
                        });
                    }
                });
                createMessage(msg, username).then((savedMessage) => {
                    logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${savedMessage._id} saved in (messages)`);
                    createMessageActivity(savedMessage._id, username, 'MOVED').then((savedMessageActivity) =>{
                        logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                        var MessageActivity = savedMessageActivity.toObject();
                        MessageActivity.msg = savedMessage;
                        // send also to firebase
                        sendFireBaseMsg(msg.system, msg.number, msg.comment)
                        findMessageData().then((messages) => {
                            var message_history = [];
                            if (messages.length == 0) {
                                logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${messages.length} records from (messages) read`);
                            } else {
                                logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${Object.keys(messages).length} records from (messages) read`);
                            }
                            for (i in messages) {
                                message_history.push(messages[i]);
                            }
                            io.emit('SEND_MSG_ALL', message_history);
                            logger.app.log('info', `socket.io - [MOVE]:         ${username} - ${messages.length} items from (messages) sent to all clients`);  
                            findMessageActivityData().then((message_activities) => {
                                io.emit('SEND_MSG_ACT_ALL', message_activities); 
                                logger.app.log('info', `socket.io - [MOVE]:         ${username} - ${message_activities.length} items from (messages_activities) sent to all clients`);
                            });
                        });
                    });               
                });
            });
           
        });
    });

    socket.on('CONFIRM_MSG', (msg_id, msg, username) => {
        increaseStars(socket.handshake.query.uid).then(() => {
            logger.app.log('info', `socket.io - [CONFIRM]:      ${username} - stars in (user_settings) increased`);
            findUserSettings(socket.handshake.query.uid).then((userSettings) => {
                socket.emit('SEND_USER_SETTINGS', userSettings); 
                logger.app.log('info', `socket.io - [CONFIRM]:      ${socket.handshake.query.username} - ${userSettings.length} items from (user_settings) sent`);
            });
        });
        editMessage(msg_id, msg, username).then((updatedMessage) => {
            logger.app.log('info', `MongoDB   - [CONFIRM]:      ${username} - ${updatedMessage._id} modified in (messages)`);
            createMessageActivity(updatedMessage._id, username, "CONFIRMED").then((savedMessageActivity) =>{
                logger.app.log('info', `MongoDB   - [CONFIRM]:      ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                var MessageActivity = savedMessageActivity.toObject();
                MessageActivity.msg = updatedMessage;
                findMessageData().then((messages) => {
                    var message_history = [];
                    if (messages.length == 0) {
                        logger.app.log('info', `MongoDB   - [CONFIRM]:      ${username} - ${messages.length} records from (messages) read`);
                    } else {
                        logger.app.log('info', `MongoDB   - [CONFIRM]:      ${username} - ${Object.keys(messages).length} records from (messages) read`);
                    }
                    for (i in messages) {
                        message_history.push(messages[i]);
                    }
                    io.emit('SEND_MSG_ALL', message_history);
                    logger.app.log('info', `socket.io - [CONFIRM]:      ${username} - ${messages.length} items from (messages) sent to all clients`);  
                    findMessageActivityData().then((message_activities) => {
                        io.emit('SEND_MSG_ACT_ALL', message_activities); 
                        logger.app.log('info', `socket.io - [CONFIRM]:      ${username} - ${message_activities.length} items from (messages_activities) sent to all clients`);
                    });
                });
            }); 
        });
    });

    socket.on('SAVE_MAP_SETTINGS', (settings, username) => {
        saveMapSettings(settings).then((mapSettings) => {
            logger.app.log('info', `socket.io - [SETTINGS]:     ${username} - ${mapSettings} save in user_map_settings`);
        });
    });

    socket.on('SAVE_USER_SETTINGS', (settings, username) => {
        saveUserSettings(settings).then((userSettings) => {
            logger.app.log('info', `socket.io - [SETTINGS]:     ${username} - ${userSettings} save in user_settings`);
        });
    });

    socket.on('disconnect', () => {
        logger.app.log('info', `socket.io - socket: ${socket.handshake.query.username} disconnected`);
    });
});

// scheduled executions
//----------------------------------------------------------
// archieve messages - checks every 1 minute and decided on alert type to delete either after 5min or 30min
schedule.scheduleJob('*/1 * * * *', function () {    
    
    // calculate current timestamp
    var date_standard = new Date();
    // date_standard.setMinutes(date_standard.getMinutes() - 5);

    // // calculate timestamp 30 min ago for camp messages
    // var date_camp = new Date();
    // date_camp.setMinutes(date_camp.getMinutes() - 30);

    // archive messages async
    var result = {};
    async function archiveMessages(){
        const archiveMessages = await messages.updateMany(
        // {$or:[
        //     {$and:[{ "dateChanged": { $lte: date_standard }},{ "active": true}, {"message.gatecamp": false}, {"message.stationcamp": false}, {"message.bubble": false}]},
        //     {$and:[{ "dateChanged": { $lte: date_camp }},{ "active": true}, {$or:[{"message.gatecamp": true}, {"message.stationcamp": true}, {"message.bubble": true}]}]}
        //     ]}
        //     ,
        //     {$set: { "active": false }}   
        { "message.dateExpire": { $lte: date_standard }},
        {$set: { "active": false }}         
        );
        result = archiveMessages;
    }
    archiveMessages().then(() => {
        if (result.nModified > 0) {
            logger.app.log('info', `MongoDB   - [-JOB-]:        SERVER - ${result.nModified} messages archieved`);
            findMessageData().then((messages) => {
                var message_history = [];
                if (messages.length == 0) {
                    logger.app.log('info', `MongoDB   - [-JOB-]:        SERVER - ${messages.length} records from (messages) read`);
                } else {
                    logger.app.log('info', `MongoDB   - [-JOB-]:        SERVER - ${Object.keys(messages).length} records from (messages) read`);
                }
                for (i in messages) {
                    message_history.push(messages[i]);
                }
                io.emit('SEND_MSG_ALL', message_history);
                logger.app.log('info', `socket.io - [-JOB-]:        SERVER - ${messages.length} items from (messages) sent to all clients`); 
                findMessageActivityData().then((message_activities) => {
                    io.emit('SEND_MSG_ACT_ALL', message_activities); 
                    logger.app.log('info', `socket.io - [-JOB-]:        SERVER - ${message_activities.length} items from (messages_activities) sent to all clients`);
                }); 
            });
        }
    });
    findMessageActivityData().then((message_activities) => {
        io.emit('SEND_MSG_ACT_ALL', message_activities); 
        logger.app.log('info', `socket.io - [-JOB-]:        SERVER - ${message_activities.length} items from (messages_activities) sent to all clients`);
    });
});


// send messages to FireBase for Andriod and IOs devices
function sendFireBaseMsg(system, count, names) {

/*     const body = {
        "to": reciever,
        "data": {
            "system": system,
            "count": count
        },
        "direct_boot_ok": true
    }; */

/* 
    fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': process.env.MESSAGE_KEY
        },
    })
    .then(res => res.json())
    .then(json => logger.app.log('info', `firebase  - [-MSG-]:        RESULT - ${JSON.stringify(json)}`));   */

    const body = {
        "system": system,
        "count": count,
        "name": names
    };

    fetch('https://pantheon-defcon-302323.appspot.com/alerts', {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': process.env.MESSAGE_KEY
        },
    })
    .then(res => res.json())
    .then(json => logger.app.log('info', `firebase  - [-MSG-]:        RESULT - ${JSON.stringify(json)}`));  
}