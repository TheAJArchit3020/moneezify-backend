// middlewares/auth.middleware.js
const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

module.exports = async function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    // Verify & decode JWT
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch user to ensure they still exist
    const user = await User.findById(payload.userId).select("_id email");
    if (!user) {
      return res.status(401).json({ error: "Invalid token: user not found" });
    }

    // Attach to request for downstream handlers
    req.user = { id: user._id, email: user.email };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
