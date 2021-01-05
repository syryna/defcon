// Modules
require('winston-mongodb');

const {
    createLogger,
    transports,
    format
} = require('winston');

/* Adding to loggers to distinguish between APPlication logging and HTTP logging. They both log to different mongo DB
collection to provide better analysis in error case. */

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