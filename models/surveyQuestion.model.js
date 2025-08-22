const mongoose = require("mongoose");

const surveyQuestionSchema = new mongoose.Schema(
  {
    // Stable identifier for the question across versions
    key: { type: String, required: true },

    text: { type: String, required: true },

    type: {
      type: String,
      enum: ["single", "multi", "text", "rating"],
      required: true,
    },

    // For single/multi
    options: { type: [String], default: [] },
    allowOther: { type: Boolean, default: false }, // supports “Other (please specify)”
    maxSelections: { type: Number, min: 1, default: 1 }, // for multi

    // For text
    textVariant: { type: String, enum: ["short", "long"], default: "short" },
    placeholder: { type: String, default: "" },
    minLength: { type: Number, default: 0 },
    maxLength: { type: Number, default: 1000 },

    // For rating
    ratingMin: { type: Number, default: 1 },
    ratingMax: { type: Number, default: 5 },
    ratingMinLabel: { type: String, default: "" },
    ratingMaxLabel: { type: String, default: "" },

    // Meta
    help: { type: String, default: "" },
    order: { type: Number, default: 0 },
    required: { type: Boolean, default: true },

    version: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Ensure a unique question per key+version (safe to upsert)
surveyQuestionSchema.index({ key: 1, version: 1 }, { unique: true });

module.exports = mongoose.model("SurveyQuestion", surveyQuestionSchema);
