// Modules
const mongoose = require('mongoose');

// Export connection
module.exports = mongoose.connect(process.env.APP_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false
});