// modules
const path = require('path');
var mongoose = require('mongoose');
const inv_map_add = require('./models/inv_map_add');

// make a connection
mongoose.connect('mongodb://localhost:27017/app', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

// get reference to database
var db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));

db.once('open', function () {
    console.log("Connection Successful!");

    var new_map_Add = new inv_map_add({
        rid: 10000060,
        add: [
            "Y-2ANO",
            "Ned",
            "Sakht",
            "A-BO4V",
            "F2OY-X",
            "4-2UXV",
            "L-FVHR",
            "RKM-GE",
            "DG-L7S",
            "K4-RFZ",
            "E-VKJV",
            "8-YNBE",
            "YQX-7U",
            "QY1E-N",
            "BX-VEX",
            "B-7DFU",
            "8QT-H4",
            "L-YMYU",
            "TN25-J"
        ]
    });

    new_map_Add.save(function (err, map_addDoc) {
        if (err) return console.error(err);
        if (map_addDoc) {
            console.log(`"${map_addDoc.rid}" - "${map_addDoc.add}" saved to inv_nodes collection.`);
        }
    });
});