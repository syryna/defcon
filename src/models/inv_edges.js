// Modules
const mongoose = require('mongoose');

//{"id":"30002022-30002021","source":"30002022","target":"30002021","color":"#CCC","size":0.1}
const inv_edgesSchema = new mongoose.Schema({
    id: {
        type: String,
        required: true
    },
    source: {
        type: Number,
        required: true
    },
    target: {
        type: Number,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    size: {
        type: Number,
        required: true
    }
});

const inv_edges = module.exports = mongoose.model('inv_edges', inv_edgesSchema);