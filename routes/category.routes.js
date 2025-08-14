// routes/category.routes.js
const express = require("express");
const auth = require("../middlewares/auth.middleware");
const {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/category.controller");
const router = express.Router();

router.get("/", auth, listCategories);
router.post("/", auth, createCategory);
router.put("/update-category", auth, updateCategory);
router.delete("/:id", auth, deleteCategory);

module.exports = router;
