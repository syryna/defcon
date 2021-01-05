// Modules
const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    discordId: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    displayName: {
        type: String
    },
    discriminator: {
        type: String,
        required: true
    },
    guilds: {
        type: Array,
        required: true
    },
    locale: {
        type: String,
        required: true
    },
    avatar: {
        type: String
    },
    type: {
        type: Number,
        required: true
    },
    locked: {
        type: Boolean,
        required: true
    },
    lastUpdate: {
        type: Date,
        required: true
    }
});

const DiscordUser = module.exports = mongoose.model('User', UserSchema);