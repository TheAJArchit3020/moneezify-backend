async function OpenAiChat(req, res) {
  try {
    const { userId } = req.user;
    const { message } = req.body;

    // Validate input
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Invalid message format" });
    }

    // Call OpenAI API or service to process the chat
    const response = await openAiService.chatWithOpenAi(userId, message);

    res.json(response);
  } catch (error) {
    console.error("OpenAI Chat Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
module.exports = { OpenAiChat };
