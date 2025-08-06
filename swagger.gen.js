// swagger.gen.js
const swaggerAutogen = require("swagger-autogen")();

const outputFile = "./swagger-output.json";
const endpointsFiles = [
  "./app.js",
  "./routes/auth.routes.js",
  "./routes/category.routes.js",
  "./routes/customPlan.routes.js",
  "./routes/dashboard.routes.js",
  "./routes/debt.routes.js",
  "./routes/expenses.routes.js",
  "./routes/payoffPlan.routes.js",
  "./routes/subscription.routes.js",
  "./routes/survey.routes.js",
  "./routes/transaction.routes.js",
  "./routes/user.routes.js",
];

const doc = {
  info: {
    title: "Moneezify API",
    version: "1.0.0",
    description: "Auto-generated docs",
  },
  servers: [
    { url: "https://api.moneezify.com" },
    { url: "http://localhost:5001" },
  ],
};

swaggerAutogen(outputFile, endpointsFiles, doc).then(() => {
  console.log("✅ Swagger JSON generated:", outputFile);
});
