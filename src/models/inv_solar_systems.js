// Modules
const mongoose = require('mongoose');

const inv_solar_systemsSchema = new mongoose.Schema({
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
    },
    constellation_id: {
        type: Number,
        required: true
    },
    hub: {
        type: Boolean,
        required: true
    },
    npc_stations: {
        type: String
    },
    planets: {
        type: String
    },
    region_id: {
        type: Number,
        required: true
    },
    stargates: {
        type: String
    }
});

const inv_solar_systems = module.exports = mongoose.model('inv_solar_systems', inv_solar_systemsSchema);