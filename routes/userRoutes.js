const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
const { verifyJWT } = require("../controllers/authMiddleware");

router.post("/user", userController.createUser);

module.exports = router;
