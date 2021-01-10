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
        predecessors: [Number],
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
        comment: {
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
        stationcamp: {
            type: Boolean,
            reuqired: true
        },
        bubble: {
            type: Boolean,
            reuqired: true
        },
        discordId: {
            type: String,
            required: true
        },
        avatar: {
            type: String
        },
        username: {
            type: String,
            required: true
        },
        discriminator: {
            type: String,
            required: true
        },
    },
    active: {
        type: Boolean,
        required: true
    },
    usernameCreated: {
        type: String,
        required: true
    },
    dateCreated: {
        type: Date,
        required: true,
        default: Date.now
    },
    usernameChanged: {
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