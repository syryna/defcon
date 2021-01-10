// Modules
const mongoose = require('mongoose');


const message_activitiesSchema = new mongoose.Schema({
    message_id: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },
    action: {
        type: String,
        required: true
    }
});

const message_activities = module.exports = mongoose.model('message_activities', message_activitiesSchema);