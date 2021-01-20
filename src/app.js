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
const server = https.createServer({
    key: fs.readFileSync("./src/security/key.pem"),
    cert: fs.readFileSync("./src/security/cert.pem"),
    ca: fs.readFileSync("./src/security/ca.pem")
},app).listen(PORT, () => {
    logger.app.log('info', `Express - Express Server listening to requests on port ${PORT}`);
});
// const server = app.listen(PORT, () => {
//     logger.app.log('info', `Express - Express Server listening to requests on port ${PORT}`);
// });

// Setup socket.io
var io = require('socket.io')(server);

const messages = require('./models/messages');
const message_activities = require('./models/message_activities');
const inv_solar_systems = require('./models/inv_solar_systems');
const solar_correct = require('./models/inv_solar_correct');
const { createConnection } = require('net');

// common DB functions
async function findMessageData() {                          // reads all active Messages and returns them all
    const message_data = await messages.find(
        { "active": true }
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

// Socket handling
io.on('connection', (socket) => {

    // Get Connection details
    logger.app.log('info', `socket.io - socket: ${socket.id} connected`);

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

    // Initial connect and sent all system and region data
    socket.on('GET_SYS_REG_DATA', (username) => {
        async function findSolarSystemData() {
            all_solar_systems_data = await inv_solar_systems.aggregate([
                { $lookup: { "from": "inv_regions", "localField": "region_id", "foreignField": "id", "as": "region" } },    // add region data to solar system (inv_solar_systems <- inv_regions)
                { $unwind: "$region" },                                                                                     // unwind the nested array region : [{...,...,...}] -> {...,...,...}
                { $project : { "id" : 1 , "name" : 1, "region_id" : 1, "region_name" : "$region.name" } }                   // define the output fields (sys_id, sys_name, region_id, region_name)
            ]);
            return all_solar_systems_data;
        }
        findSolarSystemData().then((solar_system_data) => {
            socket.emit('GET_SYS_REG_DATA', solar_system_data);
            logger.app.log('info', `socket.io - [-INIT-]:       ${username} - solar and region data items sens to user`);
        }); 
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
        createMessage(msg, username).then((savedMessage) => {
            logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${savedMessage._id} saved in (messages)`);
            createMessageActivity(savedMessage._id, username, 'CREATED').then((savedMessageActivity) =>{
                logger.app.log('info', `MongoDB   - [CREATE]:       ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                var MessageActivity = savedMessageActivity.toObject();
                MessageActivity.msg = savedMessage;
                io.emit('SEND_MSG', MessageActivity, savedMessage);
                logger.app.log('info', `socket.io - [CREATE]:       ${username} - ${savedMessage._id} in (messages) sent to all clients`);
                logger.app.log('info', `socket.io - [CREATE]:       ${username} - ${MessageActivity._id} in (message_activities) sent to all clients`);
                // send also to firebase
                sendFireBaseMsg(process.env.MIKE, msg.system, msg.number);
                sendFireBaseMsg(process.env.DAN, msg.system, msg.number);
            });               
        });
    });

    // change a message and send to all clients
    socket.on('EDIT_MSG', (msg_id, msg, username) => {
        editMessage(msg_id, msg, username).then((updatedMessage) => {
            logger.app.log('info', `MongoDB   - [EDIT]:         ${username} - ${updatedMessage._id} modified in (messages)`);
            createMessageActivity(updatedMessage._id, username, "EDITED").then((savedMessageActivity) =>{
                logger.app.log('info', `MongoDB   - [EDIT]:         ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                var MessageActivity = savedMessageActivity.toObject();
                MessageActivity.msg = updatedMessage;
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
        archieveMessage(msg_id, username).then((archievedMessage) => {
            logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${archievedMessage._id} saved in (messages)`);
            createMessageActivity(archievedMessage._id, username, "ARCHIEVED").then((savedMessageActivity) =>{
                logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                var MessageActivity = savedMessageActivity.toObject();
                MessageActivity.msg = archievedMessage;
                createMessage(msg, username).then((savedMessage) => {
                    logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${savedMessage._id} saved in (messages)`);
                    createMessageActivity(savedMessage._id, username, 'MOVED').then((savedMessageActivity) =>{
                        logger.app.log('info', `MongoDB   - [MOVE]:         ${username} - ${savedMessageActivity._id} saved in (message_activities)`);
                        var MessageActivity = savedMessageActivity.toObject();
                        MessageActivity.msg = savedMessage;
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


    socket.on('disconnect', () => {
        logger.app.log('info', `socket.io - INIT: user disconnected`);
    });
});

// scheduled executions
//----------------------------------------------------------
// archieve messages - checks every 1 minute and decided on alert type to delete either after 5min or 30min
schedule.scheduleJob('*/1 * * * *', function () {    
    
    // calculate timestamp 5 min ago for standard messages
    var date_standard = new Date();
    date_standard.setMinutes(date_standard.getMinutes() - 5);

    // calculate timestamp 30 min ago for camp messages
    var date_camp = new Date();
    date_camp.setMinutes(date_camp.getMinutes() - 30);

    // archive messages async
    var result = {};
    async function archiveMessages(){
        const archiveMessages = await messages.updateMany(
        {$or:[
            {$and:[{ "dateChanged": { $lte: date_standard }},{ "active": true}, {"message.gatecamp": false}, {"message.stationcamp": false}, {"message.bubble": false}]},
            {$and:[{ "dateChanged": { $lte: date_camp }},{ "active": true}, {$or:[{"message.gatecamp": true}, {"message.stationcamp": true}, {"message.bubble": true}]}]}
            ]}
            ,
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

    
});


//test message sending

function sendFireBaseMsg(reciever, system, count) {

    const body = {
        "to": reciever,
        "data": {
            "system": system,
            "count": count
        },
        "direct_boot_ok": true
    };

    fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'post',
        body:    JSON.stringify(body),
        headers: { 
            'Content-Type': 'application/json',
            'Authorization': process.env.MESSAGE_KEY
        },
    })
    .then(res => res.json())
    .then(json => logger.app.log('info', `firebase  - [-MSG-]:        RESULT - ${JSON.stringify(json)}`));  
}
