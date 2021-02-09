// Modules
const mongoose = require('mongoose');


const user_settingsSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true
    },
    username_original: {
        type: String,
        required: true
    },
    username: {
        type: String
    },
    stars: {
        type: Number,
        required: true
    },
    revert_y_axis: {
        type: Boolean,
        required: true
    },
    home_base: {
        type: String,
        required: true
    },
    jump_range: {
        type: Number,
        required: true
    },
    audio_alert: {
        type: Boolean,
        required: true
    }
});

const user_settings = module.exports = mongoose.model('user_settings', user_settingsSchema);