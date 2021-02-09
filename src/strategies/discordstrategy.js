// Modules
const DiscordStrategy = require('passport-discord').Strategy;
const passport = require('passport');
const DiscordUser = require('../models/DiscordUser');
const userSettings = require('../models/user_settings');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    var user = await DiscordUser.findById(id);

    if (user){
        const userSetting = await userSettings.findOne({
            discordId: user.discordId
        });
        if (userSetting.username != ''){
            console.log(user.username, userSetting.username);
            user.username = userSetting.username;
            done(null, user);
        } else {
            done(null, user);
        }
    }
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
                type: 1,
                locked: false,
                lastUpdate: new Date()
            });
            const savedUser = await newUser.save();
            const newUserSetting = await userSettings.create({
                discordId: profile.id,
                username_original: profile.username,
                username: '',
                stars: 0,
                revert_y_axis: false,
                home_base: '319-3D',
                jump_range: 5,
                audio_alert: false
            });
            const savedUserSetting = await newUserSetting.save();
            done(null, savedUser);
        }
    } catch (err) {
        appLogger.log('error', err)
        done(err, null);
    }
}));