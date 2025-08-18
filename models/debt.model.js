const mongoose = require("mongoose");
const softDeletePlugin = require("../lib/softDeletePlugin");
const debtSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    name: { type: String, required: true, trim: true },
    creditorName: { type: String, required: true, trim: true },
    principal: { type: Number, required: true },
    balance: { type: Number, required: true },
    minPaymentAmount: { type: Number, required: true },
    apr: { type: Number, required: true },
    nextDueDate: { type: Date, required: true },
    tagColor: {
      type: String,
      match: /^#([0-9A-F]{3}){1,2}$/i,
      default: "#4aff59ff",
    },
    debtPaidOff: { type: Boolean, default: false },
  },
  { timestamps: true }
);

debtSchema.plugin(softDeletePlugin);
debtSchema.index({ purgeAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Debt", debtSchema);
