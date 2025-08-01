require("dotenv").config(); // load .env into process.env
const connectDB = require("./config/db");
const app = require("./app"); // your Express app from app.js

const PORT = process.env.PORT || 5000;

(async () => {
  // 1) Connect to MongoDB
  await connectDB();

  // 2) Start Express server
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
})();
