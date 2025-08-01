const { regeneratePlanForUser } = require("../services/plan.service");

async function selectStrategy(req, res) {
  const userId = req.user.id;
  const { strategy, customPlanId } = req.body;

  const plan = await regeneratePlanForUser(userId, strategy, customPlanId);
  res.json(plan);
}

module.exports = { selectStrategy };
