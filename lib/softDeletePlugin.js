// lib/softDeletePlugin.js
module.exports = function softDeletePlugin(schema) {
  // fields added to every schema
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date },
    // Optional: set a future date to auto-purge with a TTL index in the model (see below)
    purgeAt: { type: Date },
  });

  // Query helpers
  schema.query.withDeleted = function () {
    return this.setOptions({ withDeleted: true });
  };
  schema.query.onlyDeleted = function () {
    return this.setOptions({ onlyDeleted: true });
  };

  // Auto-exclude deleted docs unless explicitly asked
  function excludeDeleted(next) {
    const opts = this.getOptions?.() || {};
    if (opts.onlyDeleted) this.where({ isDeleted: true });
    else if (!opts.withDeleted) this.where({ isDeleted: { $ne: true } });
    next();
  }
  schema.pre("find", excludeDeleted);
  schema.pre("findOne", excludeDeleted);
  schema.pre("countDocuments", excludeDeleted);
  schema.pre("findOneAndUpdate", excludeDeleted);
  schema.pre("aggregate", function (next) {
    const opts = this.options || {};
    if (!opts.withDeleted)
      this.pipeline().unshift({ $match: { isDeleted: { $ne: true } } });
    next();
  });

  // Bulk helpers for collections that have a `user` field
  schema.statics.softDeleteManyByUser = function (
    userId,
    session,
    daysToPurge
  ) {
    const now = new Date();
    const update = { $set: { isDeleted: true, deletedAt: now } };
    if (daysToPurge)
      update.$set.purgeAt = new Date(now.getTime() + daysToPurge * 86400000);
    return this.updateMany({ user: userId }, update, { session });
  };

  schema.statics.restoreManyByUser = function (userId, session) {
    return this.updateMany(
      { user: userId },
      { $set: { isDeleted: false }, $unset: { deletedAt: "", purgeAt: "" } },
      { session }
    );
  };
};
