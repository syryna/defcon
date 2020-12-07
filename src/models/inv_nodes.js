// Modules
const mongoose = require('mongoose');

//{"id":"10000001","label":"Derelik","rid":10000000,"x":541.9,"y":628.8,"size":5,"sec":0.506,"color":"#ffff00","c":""}
const inv_nodesSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    label: {
        type: String,
        required: true
    },
    rid: {
        type: Number,
        required: true
    },
    x: {
        type: Number,
        required: true
    },
    y: {
        type: Number,
        required: true
    },
    size: {
        type: Number,
        required: true
    },
    sec: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    c: {
        type: String
    }
});

const inv_nodes = module.exports = mongoose.model('inv_nodes', inv_nodesSchema);