const { Router } = require("express");
const {
  createPost,
  getPost,
  getPosts,
  getCategoryPost,
  getUserPost,
  editPost,
  deletePost,
} = require("../controllers/postController");
const authMiddleware = require("../middkewares/authMiddleware");
const router = Router();

router.post("/create", authMiddleware, createPost);
router.get("/:id", getPost);
router.get("/", getPosts);
router.get("/category/:category", getCategoryPost);
router.get("/user/:id", getUserPost);
router.patch("/:id", authMiddleware, editPost);
router.delete("/:id", authMiddleware, deletePost);

module.exports = router;
