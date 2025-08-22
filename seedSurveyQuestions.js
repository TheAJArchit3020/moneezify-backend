#!/usr/bin/env node
require("dotenv").config();
const mongoose = require("mongoose");
const path = require("path");

// Import your (updated) model
const SurveyQuestion = require("./models/surveyQuestion.model");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/moneezify";

// v1 survey (from your spec)
const version = 1;
const questionsV1 = [
  {
    key: "biggest_challenge",
    text: "What’s your biggest money-related challenge right now?",
    type: "single",
    options: [
      "Debt payoff",
      "Sticking to a budget",
      "Tracking expenses",
      "Saving for emergencies",
      "Investment Management",
      "Insurance Management",
      "Other (please specify)",
    ],
    allowOther: true,
    help: "Identifies top pain point to prioritize features.",
    order: 1,
    required: true,
    version,
    isActive: true,
  },
  {
    key: "feature_use_most",
    text: "Which feature would you use most? (choose up to 2)",
    type: "multi",
    options: [
      "Expense Tracker",
      "Progress Reminders & Alerts",
      "AI Debt-Free Plan Generator (personalized and adjusts with expenses)",
    ],
    maxSelections: 2,
    help: "Validates which modules real users value.",
    order: 2,
    required: true,
    version,
    isActive: true,
  },
  {
    key: "spend_tracking_frequency",
    text: "How often do you currently track your spending?",
    type: "single",
    options: ["Daily", "Weekly", "Monthly", "I don’t track it"],
    help: "Helps you tune notification cadence.",
    order: 3,
    required: true,
    version,
    isActive: true,
  },
  {
    key: "main_goal_text",
    text: "What’s your main goal for using Moneezify? (e.g., “Pay off my credit card in 6 months,” “Understand where my money goes”)",
    type: "text",
    textVariant: "short",
    placeholder: "Type your goal…",
    minLength: 0,
    maxLength: 280,
    help: "Captures qualitative goals for future user stories.",
    order: 4,
    required: true,
    version,
    isActive: true,
  },
  {
    key: "debt_confidence_rating",
    text: "On a scale of 1–5, how confident are you in managing your debts?",
    type: "rating",
    ratingMin: 1,
    ratingMax: 5,
    ratingMinLabel: "Not confident",
    ratingMaxLabel: "Very confident",
    help: "Baselines user self-efficacy and tracks improvement.",
    order: 5,
    required: true,
    version,
    isActive: true,
  },
  {
    key: "premium_openness",
    text: "Would you be open to premium features later (e.g., AI Debt-Free Plan Generator that adapts to your expenses)?",
    type: "single",
    options: ["Yes", "No", "Maybe, depends on price", "Let’s try it out first"],
    help: "Early gauge of willingness-to-pay.",
    order: 6,
    required: true,
    version,
    isActive: true,
  },
  {
    key: "open_feedback",
    text: "Anything else you’d love to see in a Financial Companion app?",
    type: "text",
    textVariant: "long",
    placeholder: "Share your thoughts (optional)…",
    minLength: 0,
    maxLength: 1000,
    help: "Open feedback for future roadmap ideas.",
    order: 7,
    required: false,
    version,
    isActive: true,
  },
];

async function main() {
  console.log(`[seed] connecting to ${MONGODB_URI}`);
  await mongoose.connect(MONGODB_URI);

  for (const q of questionsV1) {
    const { key } = q;
    await SurveyQuestion.updateOne(
      { key, version: q.version },
      { $set: q },
      { upsert: true }
    );
    console.log(`[seed] upserted: ${key}@v${q.version}`);
  }

  console.log("[seed] done.");
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
