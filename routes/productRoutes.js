const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { verifyJWT } = require("../controllers/authMiddleware");

router.get("/products", productController.getAllProducts);
router.get("/categories/:category", productController.getProductsByCategory);
router.get("/product/:id", productController.getSingleProduct);
router.get("/myProducts/:email", verifyJWT, productController.getMyProducts);
router.post("/products/:email", verifyJWT, productController.createProduct);
router.patch("/product/:id", verifyJWT, productController.updateProduct);
router.delete("/product/:id", verifyJWT, productController.deleteProduct);

module.exports = router;
