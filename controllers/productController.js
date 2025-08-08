const { ObjectId } = require("mongodb");

let productCollection;

const setProductCollection = (collection) => {
  productCollection = collection;
};

const getAllProducts = async (req, res) => {
  const available = req.query.available === "true";

  const query = {};
  if (available) {
    query["$expr"] = { $gte: ["$main_quantity", "$min_sell_quantity"] };
  }
  try {
    const allProducts = await productCollection
      .find(query)
      .sort({ _id: -1 })
      .toArray();
    res.send(allProducts);
  } catch (error) {
    res.status(500).send({ message: "Failed to get products" });
  }
};

const getProductsByCategory = async (req, res) => {
  const category = req.params.category;
  try {
    const products = await productCollection
      .find({ category })
      .sort({ _id: -1 })
      .toArray();
    res.send(products);
  } catch (error) {
    res.status(500).send({ message: "Failed to get category products" });
  }
};

const getSingleProduct = async (req, res) => {
  try {
    const id = req.params.id;
    const product = await productCollection.findOne({ _id: new ObjectId(id) });
    res.send(product);
  } catch (error) {
    res.status(500).send({ message: "Failed to get product" });
  }
};

const getMyProducts = async (req, res) => {
  const requestEmail = req.params.email;
  const decodedEmail = req.tokenEmail;

  if (decodedEmail !== requestEmail) {
    return res.status(403).send({ message: "Forbidden: Email mismatch" });
  }
  try {
    const products = await productCollection
      .find({ userEmail: requestEmail })
      .sort({ _id: -1 })
      .toArray();
    res.send(products);
  } catch (error) {
    res.status(500).send({ message: "Failed to get user products" });
  }
};

const createProduct = async (req, res) => {
  const emailFromToken = req.tokenEmail;
  const emailFromParam = req.params.email;

  if (emailFromToken !== emailFromParam) {
    return res.status(403).send({ message: "Unauthorized" });
  }
  try {
    const newProduct = req.body;
    const result = await productCollection.insertOne(newProduct);
    res.status(201).send(result);
  } catch (error) {
    console.error("Error inserting product:", error);
    res.status(500).send({ message: "Server Error" });
  }
};

const updateProduct = async (req, res) => {
  const requestEmail = req.query.email;
  const emailFromToken = req.tokenEmail;

  if (emailFromToken !== requestEmail) {
    return res.status(403).send({ message: "Unauthorized" });
  }

  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const existingProduct = await productCollection.findOne(query);

    if (!existingProduct) {
      return res.status(404).send({ message: "Product not found" });
    }
    if (existingProduct.userEmail !== emailFromToken) {
      return res
        .status(403)
        .send({ message: "You are not the owner of this product" });
    }
    const updatedData = req.body;
    const updatedDoc = { $set: updatedData };
    const result = await productCollection.updateOne(query, updatedDoc);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to update product" });
  }
};

const deleteProduct = async (req, res) => {
  const requestEmail = req.query.email;
  const emailFromToken = req.tokenEmail;

  if (emailFromToken !== requestEmail) {
    return res.status(403).send({ message: "Unauthorized" });
  }
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const existingProduct = await productCollection.findOne(query);

    if (!existingProduct) {
      return res.status(404).send({ message: "Product not found" });
    }
    if (existingProduct.userEmail !== emailFromToken) {
      return res
        .status(403)
        .send({ message: "You are not the owner of this product" });
    }

    const result = await productCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete product" });
  }
};

module.exports = {
  setProductCollection,
  getAllProducts,
  getProductsByCategory,
  getSingleProduct,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
