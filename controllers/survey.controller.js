// controllers/survey.controller.js
const SurveyQuestion = require("../models/surveyQuestion.model");
const SurveyResponse = require("../models/surveyResponse.model");

async function listQuestions(req, res) {
  const qs = await SurveyQuestion.find({ isActive: true });
  res.json(qs);
}

async function submitResponses(req, res) {
  const userId = req.user.id;
  const answers = req.body.answers;
  // answers: [{ questionId, answer }...]
  const questions = await SurveyQuestion.find({ isActive: true });

  const version = questions[0]?.version || 1;
  // upsert each
  await Promise.all(
    answers.map((a) =>
      SurveyResponse.findOneAndUpdate(
        { user: userId, question: a.questionId, version },
        { answer: a.answer },
        { upsert: true }
      )
    )
  );

  // mark user as “surveyCompleted”
  // and grant a 3‐month trial starting now

  await require("../services/subscription.service").startTrial(userId);

  res.json({ success: true });
}

module.exports = { listQuestions, submitResponses };
