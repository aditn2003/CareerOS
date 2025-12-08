const LinkedInStrategy = require('passport-linkedin-oauth2').Strategy;
const axios = require('axios');

module.exports = function(passport) {
  passport.use(
    new LinkedInStrategy(
      {
        clientID: process.env.LINKEDIN_CLIENT_ID,
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
        callbackURL: process.env.LINKEDIN_CALLBACK_URL,
        // Updated to use OpenID Connect scopes (LinkedIn's new standard)
        scope: ['openid', 'profile', 'email'],
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Store LinkedIn profile data from OpenID Connect response
          const linkedinUser = {
            linkedinId: profile.id || profile.sub,
            firstName: profile.name?.givenName || profile.given_name,
            lastName: profile.name?.familyName || profile.family_name,
            email: profile.emails?.[0]?.value || profile.email,
            profileUrl: profile.profileUrl,
            photo: profile.photos?.[0]?.value || profile.picture,
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
