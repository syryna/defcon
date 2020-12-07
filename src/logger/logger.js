// Modules
require('winston-mongodb');

const {
    createLogger,
    transports,
    format
} = require('winston');

const logger = {
    app: createLogger({
        transports: [
            // to be removed for production !!!
            new transports.Console({
                level: 'info',
                format: format.combine(format.timestamp(), format.json())
            }),
            new transports.MongoDB({
                db: process.env.LOGGER_DB,
                level: 'info',
                options: {
                    useUnifiedTopology: true
                },
                collection: 'app',
                format: format.combine(format.timestamp(), format.json())
            })
        ]
    }),
    http: createLogger({
        transports: [
            new transports.MongoDB({
                db: process.env.LOGGER_DB,
                level: 'info',
                options: {
                    useUnifiedTopology: true
                },
                collection: 'http',
                format: format.combine(format.timestamp(), format.json())
            })
        ]
    })
};

module.exports = logger