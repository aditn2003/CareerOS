const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const axios = require('axios');

module.exports = function(passport) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: process.env.LINKEDIN_CALLBACK_URL,
        scope: ['r_liteprofile', 'r_emailaddress'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Store LinkedIn profile data
          const linkedinUser = {
            linkedinId: profile.id,
            firstName: profile.name?.givenName,
            lastName: profile.name?.familyName,
            email: profile.emails?.[0]?.value,
            profileUrl: profile.profileUrl,
            photo: profile.photos?.[0]?.value,
            headline: profile._json?.localizedHeadline,
            summary: profile._json?.localizedSummary,
            accessToken: accessToken,
            refreshToken: refreshToken,
          };

          return done(null, linkedinUser);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );

  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user);
  });

  // Deserialize user
  passport.deserializeUser((user, done) => {
    done(null, user);
  });
};
