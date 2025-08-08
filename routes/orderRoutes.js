const express = require("express");
const router = express.Router();
const orderController = require("../controllers/orderController");
const { verifyJWT } = require("../controllers/authMiddleware");

router.get("/orders/:email", verifyJWT, orderController.getOrdersByEmail);
router.post("/orders/:email", verifyJWT, orderController.createOrder);
router.delete("/orders/:id", verifyJWT, orderController.deleteOrder);

module.exports = router;
