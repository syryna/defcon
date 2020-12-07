// Modules
const mongoose = require('mongoose');

const inv_regionsSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    center: {
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        },
        z: {
            type: Number,
            required: true
        },
    },
    min: {
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        },
        z: {
            type: Number,
            required: true
        },
    },
    max: {
        x: {
            type: Number,
            required: true
        },
        y: {
            type: Number,
            required: true
        },
        z: {
            type: Number,
            required: true
        },
    },
    neighbours: [Number],
    security: {
        type: Number,
        required: true
    }
});

const inv_regions = module.exports = mongoose.model('inv_regions', inv_regionsSchema);