// Modules
const mongoose = require('mongoose');

//{"rid":"10000060",add":["test", "test2"]}
const inv_map_addSchema = new mongoose.Schema({
    rid: {
        type: Number,
        required: true
    },
    add: [String]
});

const inv_map_add = module.exports = mongoose.model('inv_map_add', inv_map_addSchema);