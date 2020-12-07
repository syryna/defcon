// Modules
require('dotenv').config();
const express = require('express');
const logger = require('./logger/logger');
const path = require('path');
const mongoose = require('mongoose');

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

// Express Listener
const server = app.listen(PORT, () => {
    logger.app.log('info', `Express - Express Server listening to requests on port ${PORT}`);
});

// Setup socket.io
var io = require('socket.io')(server);

const messages = require('./models/messages');

// Socket handling
io.on('connection', (socket) => {

    // Get Connection details
    logger.app.log('info', `socket.io - client: ${socket.id} - ${socket.request.user} connected`);

    // initial connect from a new browser
    socket.on('GET_MSG_ALL', (msg) => {
        // load async node data from DB
        async function findMessageData() {
            message_data = await messages.find({});
            return message_data;
        }
        // start when promise is available and send messages
        findMessageData().then((message_data) => {
            if (message_data.length == 0) {
                logger.app.log('info', `MongoDB - messages - No record found !!!`);
                var message_history = [];
                socket.emit('SEND_MSG_ALL', message_history);
                logger.app.log('info', `socket.io - message with ${message_data.length} items set to  client: ${socket.id}`);
                return
            } else {
                logger.app.log('info', `MongoDB - messages - ${Object.keys(message_data).length} records from messages read`);
                var message_history = [];
                for (i in message_data) {
                    message_history.push(message_data[i]);
                }
                socket.emit('SEND_MSG_ALL', message_history);
                logger.app.log('info', `socket.io - message with ${message_data.length} items set to  client: ${socket.id}`);
            }
        });
    });

    // Store sent data
    socket.on('SAVE_MSG', (msg) => {
        const createMessage = async function(msg){
            const newMessage = await messages.create({
                message: msg,
                active: true,
                discordIdCreated: msg.uid,
                dateCreated: new Date(),
                discordIdChanged: msg.uid,
                dateChanged: new Date()
            });
            try {
                const savedMessage = await newMessage.save();
                logger.app.log('info', `MongoDB - messages - saved message: ${JSON.stringify(savedMessage)}`);
                io.emit('SEND_MSG', [savedMessage]);
            } catch (err) {
                logger.app.log('info', `MongoDB - messages - save failed with error: ${err}`);
            }
            
        }
        createMessage(msg);
    });

    // Delete data
    socket.on('DEL_MSG', (id) => {
        const deleteMessage = async function(id){
            try {
                const deleteMessage = await messages.findByIdAndDelete({ _id: id });
                logger.app.log('info', `MongoDB - messages - deleted message: ${JSON.stringify(deleteMessage)}`);
            } catch (err) {
                logger.app.log('info', `MongoDB - messages - delete failed with error: ${err}`);
            }
            
        }
        deleteMessage(id);

         // load async node data from DB
        async function findMessageData() {
            message_data = await messages.find({});
            return message_data;
        }
        // start when promise is available and send messages
        findMessageData().then((message_data) => {
            if (message_data.length == 0) {
                logger.app.log('info', `MongoDB - messages - No record found !!!`);
                var message_history = [];
                io.emit('SEND_MSG_ALL', message_history);
                logger.app.log('info', `socket.io - message with ${message_data.length} items set to  client: ${socket.id}`);
                return
            } else {
                logger.app.log('info', `MongoDB - messages - ${Object.keys(message_data).length} records from messages read`);
                var message_history = [];
                for (i in message_data) {
                    message_history.push(message_data[i]);
                }
                io.emit('SEND_MSG_ALL', message_history);
                logger.app.log('info', `socket.io - message with ${message_data.length} items set to  client: ${socket.id}`);
            }
        });
    });


    socket.on('disconnect', () => {
        logger.app.log('info', `socket.io - user disconnected`);
    });

});

//https://github.com/tyler-speakman/nodejs-d3js-with-socket-io-demo