// Modules
require('dotenv').config();
const express = require('express');
const logger = require('./logger/logger');
const path = require('path');
const mongoose = require('mongoose');
var schedule = require('node-schedule');

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
const server = app.listen(PORT, () => {
    logger.app.log('info', `Express - Express Server listening to requests on port ${PORT}`);
});

// Setup socket.io
var io = require('socket.io')(server);

const messages = require('./models/messages');
const inv_solar_systems = require('./models/inv_solar_systems');
const solar_correct = require('./models/inv_solar_correct');
const { createConnection } = require('net');

// Socket handling
io.on('connection', (socket) => {

    // Get Connection details
    logger.app.log('info', `socket.io - client: ${socket.id} - ${socket.request.user} connected`);

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
    socket.on('GET_SYS_REG_DATA', (msg) => {
        // load async solar system data from DB
        async function findSolarSystemData() {
            all_solar_systems_data = await inv_solar_systems.aggregate([{ 
                $lookup: {                                      // add region data to solar system (inv_solar_systems <- inv_regions)
                    "from": "inv_regions",
                    "localField": "region_id",
                    "foreignField": "id",
                    "as": "region"
                }
            },
            { 
                "$unwind": "$region"                            // unwind the nested array region : [{...,...,...}] -> {...,...,...}
            },
            { 
                $project : {                                    // define the output fields (sys_id, sys_name, region_id, region_name)
                    "id" : 1 , 
                    "name" : 1,
                    "region_id" : 1,
                    "region_name" : "$region.name"
                }
            } 
            ]);
            return all_solar_systems_data;
        }
        // start when promise is available and send messages
        findSolarSystemData().then((solar_system_data) => {
            socket.emit('GET_SYS_REG_DATA', solar_system_data);
            logger.app.log('info', `socket.io - INIT: solar and region data items sent to client: ${socket.id}`);
        }); 
    });

    // initial connect from a new browser
    socket.on('GET_MSG_ALL', (msg) => {
        // load async node data from DB
        async function findMessageData() {
            message_data = await messages.find({ "active": true });
            return message_data;
        }
        // start when promise is available and send messages
        findMessageData().then((message_data) => {
            if (message_data.length == 0) {
                logger.app.log('info', `MongoDB - messages - No record found !!!`);
                var message_history = [];
                socket.emit('SEND_MSG_ALL', message_history);
                logger.app.log('info', `socket.io - INIT: message with ${message_data.length} items sent to client: ${socket.id}`);
                return
            } else {
                logger.app.log('info', `MongoDB - messages - ${Object.keys(message_data).length} records from messages read`);
                var message_history = [];
                for (i in message_data) {
                    message_history.push(message_data[i]);
                }
                socket.emit('SEND_MSG_ALL', message_history);
                logger.app.log('info', `socket.io - INIT: message with ${message_data.length} items sent to client: ${socket.id}`);
            }
        });
    });

    // Store sent data
    socket.on('SAVE_MSG', (msg) => {
        const createMessage = async function(msg){
            const newMessage = await messages.create({
                message: msg,
                active: true,
                usernameCreated: msg.username,
                dateCreated: new Date(),
                usernameChanged: msg.username,
                dateChanged: new Date()
            });
            try {
                const savedMessage = await newMessage.save();
                logger.app.log('info', `MongoDB - messages - saved message: ${JSON.stringify(savedMessage)}`);
                io.emit('SEND_MSG', savedMessage);
                logger.app.log('info', `socket.io - CREATE: saved message: ${JSON.stringify(savedMessage)}`);
            } catch (err) {
                logger.app.log('info', `MongoDB - messages - save failed with error: ${err}`);
            }
            
        }
        createMessage(msg);
    });

    // Edit data
    socket.on('EDIT_MSG', (msg_id, msg) => {
        const editMessage = async function(msg){
            try {
                const updateMessage = await messages.updateOne({ _id: msg_id }, { $set: { "message": msg, "usernameChanged": msg.username, "dateChanged": new Date() } });
                logger.app.log('info', `MongoDB - messages - saved message: ${updateMessage.nModified}`);
            } catch (err) {
                logger.app.log('info', `MongoDB - messages - save failed with error: ${err}`);
            }
        }
        editMessage(msg).then(() => {
            // load async node data from DB
            async function findMessageData() {
                message_data = await messages.find({ "active": true });
                return message_data;
            }
            // start when promise is available and send messages
            findMessageData().then((message_data) => {
                if (message_data.length == 0) {
                    logger.app.log('info', `MongoDB - messages - No record found !!!`);
                    var message_history = [];
                    io.emit('SEND_MSG_ALL', message_history);
                    logger.app.log('info', `socket.io - EDIT: message with ${message_data.length} items sent to all clients`);
                    return
                } else {
                    logger.app.log('info', `MongoDB - messages - ${Object.keys(message_data).length} records from messages read`);
                    var message_history = [];
                    for (i in message_data) {
                        message_history.push(message_data[i]);
                    }
                    io.emit('SEND_MSG_ALL', message_history);
                    logger.app.log('info', `socket.io - EDIT: message with ${message_data.length} items sent to all clients`);
                }
            });
        });
    });

    // Delete data
    socket.on('DEL_MSG', (id) => {
        const deleteMessage = async function(id){
            try {
                const deleteMessage = await messages.updateOne({ _id: id }, { $set: { "active": false } });
                logger.app.log('info', `MongoDB - messages - set message inactive: ${JSON.stringify(deleteMessage)}`);
            } catch (err) {
                logger.app.log('info', `MongoDB - messages - set message inactive error: ${err}`);
            }
        }
        deleteMessage(id).then(() => {
            // load async node data from DB
            async function findMessageData() {
                message_data = await messages.find({ "active": true });
                return message_data;
            }
            // start when promise is available and send messages
            findMessageData().then((message_data) => {
                if (message_data.length == 0) {
                    logger.app.log('info', `MongoDB - messages - No record found !!!`);
                    var message_history = [];
                    io.emit('SEND_MSG_ALL', message_history);
                    logger.app.log('info', `socket.io - DELETE: message with ${message_data.length} items set to all clients`);
                    return
                } else {
                    logger.app.log('info', `MongoDB - messages - ${Object.keys(message_data).length} records from messages read`);
                    var message_history = [];
                    for (i in message_data) {
                        message_history.push(message_data[i]);
                    }
                    io.emit('SEND_MSG_ALL', message_history);
                    logger.app.log('info', `socket.io - DELETE: message with ${message_data.length} items set to all clients`);
                }
            });
        });
    });


    socket.on('disconnect', () => {
        logger.app.log('info', `socket.io - INIT: user disconnected`);
    });
});

// scheduled executions
//----------------------------------------------------------
// update all messages older than 30 min and send remaining to clients every minute
schedule.scheduleJob('*/1 * * * *', function () {    
    
    // calculate timestamp 30 min ago
    var date = new Date();
    date.setMinutes(date.getMinutes() - 5);

    // archive messages async
    var result = {};
    const archiveMessages = async function(){
        try {
            const archiveMessages = await messages.updateMany({ "dateChanged": { $lte: date }, "active": true },  {$set: { "active": false } });
            result = archiveMessages;
        } catch (err) {
            logger.app.log('info', `MongoDB - messages - archive messages error: ${err}`);
        }
    }
    
    // once archieved do
    archiveMessages().then(() => {

        if (result.nModified > 0) {
            logger.app.log('info', `MongoDB - messages - ${result.nModified} messages archieved`);
            // load async node data from DB
            async function findMessageData() {
                message_data = await messages.find({ "active": true });
                return message_data;
            }
            // start when promise is available and send messages
            findMessageData().then((message_data) => {
                if (message_data.length == 0) {
                    var message_history = [];
                    io.emit('SEND_MSG_ALL', message_history);
                    return
                } else {
                    var message_history = [];
                    for (i in message_data) {
                        message_history.push(message_data[i]);
                    }
                    io.emit('SEND_MSG_ALL', message_history);
                }
            });
        }
        
    });

    
});