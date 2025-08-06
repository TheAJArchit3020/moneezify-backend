// models/surveyResponse.model.js
const mongoose = require("mongoose");

const surveyResponseSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SurveyQuestion",
      required: true,
    },
    answer: { type: mongoose.Schema.Types.Mixed, required: true }, // string, [string], number
    version: { type: Number, required: true },
  },
  { timestamps: true }
);

surveyResponseSchema.index(
  { user: 1, question: 1, version: 1 },
  { unique: true }
);

module.exports = mongoose.model("SurveyResponse", surveyResponseSchema);
