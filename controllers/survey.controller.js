// controllers/survey.controller.js
const SurveyQuestion = require("../models/surveyQuestion.model");
const SurveyResponse = require("../models/surveyResponse.model");
const userModel = require("../models/user.model");
const userDetailsModel = require("../models/userDetails.model");

async function listSurveyQuestions(req, res) {
  const version = Number(req.query.version) || 1;
  const rows = await SurveyQuestion.find({
    isActive: true,
    version,
  })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  res.json({ version, count: rows.length, questions: rows });
}

async function submitResponses(req, res) {
  const userId = req.user.id;
  const answers = Array.isArray(req.body.answers) ? req.body.answers : [];
  // answers: [{ questionId, answer }...]

  if (!answers.length) {
    return res.status(400).json({ error: "No answers provided." });
  }

  // 1) Load active questions + choose version (max of active)
  const activeQuestions = await SurveyQuestion.find({ isActive: true }).lean();
  if (!activeQuestions.length) {
    return res.status(400).json({ error: "No active survey questions." });
  }
  const version = activeQuestions.reduce(
    (m, q) => Math.max(m, q.version || 1),
    1
  );
  const qMap = new Map(activeQuestions.map((q) => [String(q._id), q]));

  // 2) Load user identity snapshot
  const [userDoc, details] = await Promise.all([
    userModel.findById(userId).select("email").lean(),
    userDetailsModel.findOne({ user: userId }).select("name email").lean(),
  ]);
  const userName = details?.name || "";
  const userEmail = details?.email || userDoc?.email || "";

  // 3) Build entries array (question snapshot + answer)
  const entries = [];
  for (const a of answers) {
    const q = qMap.get(String(a.questionId));
    if (!q) continue; // skip unknown question ids

    // Minimal normalization by type
    let normalizedAnswer = a.answer;
    switch (q.type) {
      case "multi":
        if (!Array.isArray(normalizedAnswer))
          normalizedAnswer = [normalizedAnswer].filter(Boolean);
        break;
      case "rating":
        if (normalizedAnswer != null)
          normalizedAnswer = Number(normalizedAnswer);
        break;
      case "single":
      case "text":
      default:
        // leave as-is (string or whatever you collect)
        break;
    }

    entries.push({
      question: q._id,
      questionText: q.text,
      type: q.type,
      options: Array.isArray(q.options) ? q.options : [],
      answer: normalizedAnswer,
    });
  }

  if (!entries.length) {
    return res
      .status(400)
      .json({ error: "No valid answers matched active questions." });
  }

  // 4) Upsert a single survey response doc per user/version
  await SurveyResponse.findOneAndUpdate(
    { user: userId, version },
    {
      $set: {
        userName,
        userEmail,
        version,
        entries,
        completedAt: new Date(),
      },
    },
    { upsert: true, new: true }
  );

  // 5) Kick off trial (if that’s your business logic)
  try {
    await require("../services/subscription.service").startTrial(userId);
  } catch (e) {
    // Don’t fail the submission if trial setup hiccups
    console.warn("startTrial failed:", e?.message || e);
  }

  return res.json({ success: true, version, count: entries.length });
}

module.exports = { listSurveyQuestions, submitResponses };
