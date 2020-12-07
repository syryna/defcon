// Modules
const mongoose = require('mongoose');

const messagesSchema = new mongoose.Schema({
    message: {
        id: {
            type: Number,
            required: true
        },
        system: {
            type: String,
            required: true
        },
        type: {
            type: String,
            required: true
        },
        number: {
            type: Number,
            required: true
        },
        loc: {
            type: String
        },
        shiptype: {
            u: {
                type: Number
            },
            f: {
                type: Number
            },
            d: {
                type: Number
            },
            c: {
                type: Number
            },
            bc: {
                type: Number
            },
            bs: {
                type: Number
            },
            i: {
                type: Number
            }
        },
        gatecamp: {
            type: Boolean,
            reuqired: true
        },
        bubble: {
            type: Boolean,
            reuqired: true
        },
        uid: {
            type: String,
            required: true
        }
    },
    active: {
        type: Boolean,
        required: true
    },
    discordIdCreated: {
        type: String,
        required: true
    },
    dateCreated: {
        type: Date,
        required: true,
        default: Date.now
    },
    discordIdChanged: {
        type: String,
        required: true
    },
    dateChanged: {
        type: Date,
        required: true,
        default: Date.now
    }
});

const messages = module.exports = mongoose.model('messages', messagesSchema);