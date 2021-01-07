// Modules
const mongoose = require('mongoose');

//{"id":"30004719",coords":{x: '', z: ''}, label: 'right'}
const inv_solar_correctSchema = new mongoose.Schema({
    id: {
        type: Number,
        required: true
    },
    coords: {
        x: { type: Number },
        z: { type: Number }
    },
    label: {
        type: String
    }
});

const inv_solar_coorect = module.exports = mongoose.model('inv_solar_correct', inv_solar_correctSchema);