const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      lowercase: true,
      unique: true,
      required: true,
    },
    // One of these will be populated based on platform:
    googleId: { type: String, unique: true, sparse: true },
    appleId: { type: String, unique: true, sparse: true },

    // optional link to profile details:
    detailsRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserDetails",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
