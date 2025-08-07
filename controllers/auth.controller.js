const { OAuth2Client } = require("google-auth-library");
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const userDetailsModel = require("../models/userDetails.model");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

async function googleSignIn(req, res) {
  const { idToken } = req.body;
  if (!idToken)
    return res.status(400).json({ error: "Authentication Required" });

  // 1) Verify with Google
  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    return res.status(401).json({ error: "Incorrect Authentication" });
  }

  // 2) Find or create auth user
  let user = await User.findOne({ googleId: payload.sub });
  if (!user) {
    user = await User.create({
      email: payload.email,
      googleId: payload.sub,
    });
  }

  // 3) Issue your own JWT
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });

  // 4) Tell front‑end whether details exist
  let details = null;
  if (user.detailsRef) {
    details = await userDetailsModel.findById(user.detailsRef).lean();
  }

  res.json({
    token,
    userId: user._id,
    detailsExists: Boolean(details),
    details, // will be `null` if no details yet
  });
}

async function devLogin(req, res) {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "Dev login disabled" });
  }
  const { email, googleId, appleId } = req.body;
  if (!email) return res.status(400).json({ error: "Missing email" });

  // find or create user
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ email, googleId, appleId });
  }

  // issue JWT
  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "30s",
  });

  res.json({
    token,
    userId: user._id,
    detailsExists: Boolean(user.detailsRef),
  });
}

module.exports = { googleSignIn, devLogin };
