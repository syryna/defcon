// Modules
const mongoose = require('mongoose');


const user_map_settingsSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    settings: {
        type: Object,
        required: true
    }
});

const user_map_settings = module.exports = mongoose.model('user_map_settings', user_map_settingsSchema);