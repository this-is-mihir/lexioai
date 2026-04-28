const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User.model");
const { getGeneralSettings } = require("../utils/platformSettings.utils");

// ----------------------------------------------------------------
// GOOGLE STRATEGY
// ----------------------------------------------------------------
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["profile", "email"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value?.toLowerCase();
        const fullName = profile.displayName;
        const googleId = profile.id;
        const avatar = profile.photos?.[0]?.value || null;
        const generalSettings = await getGeneralSettings();

        // Split fullName into firstName and lastName
        const nameParts = fullName?.trim().split(/\s+/) || ["User"];
        const firstName = nameParts[0] || "User";
        const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

        if (!email) {
          return done(null, false, {
            message: "No email found in Google account. Please use a Google account with an email address.",
          });
        }

        // Existing user check — email se
        let user = await User.findOne({ email }).select("+refreshTokens");

        if (!user) {
          // New user — auto-register via Google
          // Check if new registrations are allowed
          if (generalSettings?.allowNewRegistrations === false) {
            return done(null, false, {
              message: "New registrations are currently disabled. Please contact support.",
            });
          }

          user = await User.create({
            firstName,
            lastName,
            email,
            googleId,
            avatar,
            isEmailVerified: true, // Google email is already verified
          });
        } else {
          // Existing user — link Google if not already linked
          if (!user.googleId) {
            user.googleId = googleId;
            if (!user.avatar && avatar) {
              user.avatar = avatar;
            }
            user.isEmailVerified = true;
            await user.save();
          }
        }

        // Banned check
        if (user.isBanned) {
          return done(null, false, {
            message: `Your account has been suspended. Please contact support.`,
          });
        }

        // Inactive check
        if (!user.isActive) {
          return done(null, false, {
            message: "Your account is deactivated. Please contact support.",
          });
        }

        return done(null, user);
      } catch (error) {
        console.error("Google OAuth error:", error);
        return done(error, false);
      }
    }
  )
);

// ----------------------------------------------------------------
// SERIALIZE / DESERIALIZE — Session ke liye (hum JWT use kar rahe hain
// isliye sirf user id store karenge)
// ----------------------------------------------------------------
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

module.exports = passport;