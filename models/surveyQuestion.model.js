// models/surveyQuestion.model.js
const mongoose = require("mongoose");

const surveyQuestionSchema = new mongoose.Schema(
  {
    text: { type: String, required: true },
    type: {
      type: String,
      enum: ["single", "multi", "text", "rating"],
      required: true,
    },
    options: { type: [String], default: [] }, // for single/multi
    version: { type: Number, default: 1 }, // bump when you change questions
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SurveyQuestion", surveyQuestionSchema);
