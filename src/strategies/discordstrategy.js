// Modules
const DiscordStrategy = require('passport-discord').Strategy;
const passport = require('passport');
const DiscordUser = require('../models/DiscordUser');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await DiscordUser.findById(id);
    if (user)
        done(null, user);
});

// Get User Data and Guild data from Discord and store in MongoDB
passport.use(new DiscordStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CLIENT_REDIRECT,
    scope: ['identify', 'guilds']
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Lookup in DB if user already exists
        const user = await DiscordUser.findOne({
            discordId: profile.id
        });
        // if it exists update it
        if (user) {
            const newvalue = {
                username: profile.username,
                displayName: profile.displayName,
                discriminator: profile.discriminator,
                guilds: profile.guilds,
                locale: profile.locale,
                avatar: profile.avatar,
                lastUpdate: new Date()
            };
            const updateUser = await DiscordUser.updateOne({
                discordId: profile.id
            }, {
                $set: newvalue
            });
            done(null, user);
        }
        // if it does not exist create new user in Mongo
        else {
            const newUser = await DiscordUser.create({
                discordId: profile.id,
                username: profile.username,
                displayName: profile.displayName,
                discriminator: profile.discriminator,
                guilds: profile.guilds,
                locale: profile.locale,
                avatar: profile.avatar,
                lastUpdate: new Date()
            });
            const savedUser = await newUser.save();
            done(null, savedUser);
        }
    } catch (err) {
        appLogger.log('error', err)
        done(err, null);
    }
}));