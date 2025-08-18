const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      lowercase: true,
      required: true,
    },
    // One of these will be populated based on platform:
    googleId: { type: String },
    appleId: { type: String },

    // optional link to profile details:
    detailsRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserDetails",
    },
  },
  { timestamps: true }
);

userSchema.plugin(softDeletePlugin);
userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { isDeleted: { $eq: false } } }
);
userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      googleId: { $type: "string" }, // <-- instead of $ne: null
    },
  }
);

// unique when active AND appleId is a string
userSchema.index(
  { appleId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      isDeleted: false,
      appleId: { $type: "string" },
    },
  }
);

userSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model("User", userSchema);
