const mongoose = require("mongoose");

const entrySchema = new mongoose.Schema(
  {
    // Snapshot the question so future edits to the question don't change past responses
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyQuestion",
      required: true,
    },
    questionText: { type: String, required: true },
    type: {
      type: String,
      enum: ["single", "multi", "text", "rating"],
      required: true,
    },
    options: { type: [String], default: [] }, // snapshot of options (if any)
    answer: { type: mongoose.Schema.Types.Mixed, required: true }, // string | [string] | number
  },
  { _id: false }
);

const surveyResponseSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Snapshot of user identity at submission time
    userName: { type: String, default: "" },
    userEmail: { type: String, default: "" },

    version: { type: Number, required: true },

    // All Q&A pairs for this submission
    entries: { type: [entrySchema], default: [] },

    completedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// One document per user per survey version
surveyResponseSchema.index({ user: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("SurveyResponse", surveyResponseSchema);
