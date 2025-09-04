const express = require("express");
const router = express.Router();
const blogController = require("../controller/blogs.controller");

// Token-Authentifizierung Middleware
const authenticate = blogController.authenticateToken;

// CREATE Blog (nur Vorstände)
router.post("/", authenticate, blogController.createBlog);

// GET alle Blogs (mit einem zufälligen Tagesbild)
router.get("/", blogController.getBlogs);

// GET Blog nach ID (mit allen Bildern)
router.get("/:id", blogController.getBlogById);

// UPDATE Blog (nur Admin)
router.put("/:id", authenticate, blogController.updateBlog);

// DELETE Blog (nur Admin)
router.delete("/:id", authenticate, blogController.deleteBlog);

module.exports = router;
