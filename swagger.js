// swagger.js
const swaggerJSDoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

// Basic metadata for all your APIs
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Moneezify API",
      version: "1.0.0",
      description: "Auto-generated docs for Moneezify backend",
    },
    servers: [
      { url: "https://api.moneezify.com", description: "Production server" },
      { url: "http://localhost:5001", description: "Local dev server" },
    ],
  },
  // Point to all files where you’ll write JSDoc @swagger comments
  apis: ["./server.js", "./routes/**/*.js"],
};

const swaggerSpec = swaggerJSDoc(options);

module.exports = function (app) {
  // Serve JSON at /api-docs.json
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swaggerSpec);
  });

  // Serve UI at /api-docs
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
    })
  );
};
