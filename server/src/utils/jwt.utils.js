const jwt = require("jsonwebtoken");
const { getJWTSettings, parseDurationToMs } = require("./platformSettings.utils");

// ----------------------------------------------------------------
// GENERATE ACCESS TOKEN
// ----------------------------------------------------------------
const generateAccessToken = async (userId) => {
  const jwtSettings = await getJWTSettings();
  return jwt.sign(
    { id: userId, type: "access" },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: jwtSettings.accessExpiry || process.env.JWT_ACCESS_EXPIRES || "15m" }
  );
};

// ----------------------------------------------------------------
// GENERATE REFRESH TOKEN
// ----------------------------------------------------------------
const generateRefreshToken = async (userId, rememberMe = false) => {
  const jwtSettings = await getJWTSettings();
  const expiresIn = rememberMe
    ? process.env.JWT_REFRESH_EXPIRES_REMEMBER || "30d"
    : jwtSettings.refreshExpiry || process.env.JWT_REFRESH_EXPIRES || "7d";

  return jwt.sign(
    { id: userId, type: "refresh" },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn }
  );
};

// ----------------------------------------------------------------
// GENERATE 2FA CHALLENGE TOKEN
// ----------------------------------------------------------------
const generateTwoFactorToken = (userId, rememberMe = false) => {
  return jwt.sign(
    { id: userId, type: "2fa", rememberMe: Boolean(rememberMe) },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_2FA_CHALLENGE_EXPIRES || "5m" }
  );
};

// ----------------------------------------------------------------
// VERIFY ACCESS TOKEN
// ----------------------------------------------------------------
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    return null;
  }
};

// ----------------------------------------------------------------
// VERIFY REFRESH TOKEN
// ----------------------------------------------------------------
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
};

// ----------------------------------------------------------------
// VERIFY 2FA CHALLENGE TOKEN
// ----------------------------------------------------------------
const verifyTwoFactorToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    if (decoded?.type !== "2fa") return null;
    return decoded;
  } catch (error) {
    return null;
  }
};

// ----------------------------------------------------------------
// SET REFRESH TOKEN COOKIE
// ----------------------------------------------------------------
const setRefreshTokenCookie = async (res, refreshToken, rememberMe = false) => {
  const jwtSettings = await getJWTSettings();

  const rememberDuration = process.env.JWT_REFRESH_EXPIRES_REMEMBER || "30d";
  const refreshDuration = jwtSettings.refreshExpiry || process.env.JWT_REFRESH_EXPIRES || "7d";

  let maxAge = rememberMe
    ? parseDurationToMs(rememberDuration, 30 * 24 * 60 * 60 * 1000)
    : parseDurationToMs(refreshDuration, 7 * 24 * 60 * 60 * 1000);

  const sessionTimeoutMinutes = Number(jwtSettings.sessionTimeoutMinutes) || 0;
  if (!rememberMe && sessionTimeoutMinutes > 0) {
    maxAge = Math.min(maxAge, sessionTimeoutMinutes * 60 * 1000);
  }

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,       // JavaScript se access nahi hoga
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    maxAge,
    path: "/",
  });
};

// ----------------------------------------------------------------
// CLEAR REFRESH TOKEN COOKIE
// ----------------------------------------------------------------
const clearRefreshTokenCookie = (res) => {
  res.clearCookie("refreshToken", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
    path: "/",
  });
};

// ----------------------------------------------------------------
// GENERATE BOTH TOKENS
// ----------------------------------------------------------------
const generateTokens = async (userId, rememberMe = false) => {
  const accessToken = await generateAccessToken(userId);
  const refreshToken = await generateRefreshToken(userId, rememberMe);
  return { accessToken, refreshToken };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTwoFactorToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyTwoFactorToken,
  setRefreshTokenCookie,
  clearRefreshTokenCookie,
  generateTokens,
};