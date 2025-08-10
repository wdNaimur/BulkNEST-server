const { ObjectId } = require("mongodb");

let orderCollection;
let productCollection;

const setCollections = (ordersCol, productsCol) => {
  orderCollection = ordersCol;
  productCollection = productsCol;
};

const getOrdersByEmail = async (req, res) => {
  const decodedEmail = req.tokenEmail;
  const email = req.params.email;

  if (email !== decodedEmail) {
    return res.status(403).send({ message: "unauthorized access" });
  }

  try {
    const orders = await orderCollection
      .find({ orderedFrom: email })
      .sort({ _id: -1 })
      .toArray();
    if (!orders.length) {
      return res
        .status(404)
        .send({ message: "No orders found for this email." });
    }

    const fullOrderDetails = await Promise.all(
      orders.map(async (order) => {
        const product = await productCollection.findOne({
          _id: new ObjectId(order.productId),
        });
        if (product) {
          order.productImage = product.image;
          order.productBrand = product.brand;
          order.productName = product.name;
          order.totalPrice = order.quantity * product.price;
        }
        return order;
      })
    );

    res.send(fullOrderDetails);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error retrieving orders" });
  }
};

const getSellerOrdersByEmail = async (req, res) => {
  const decodedEmail = req.tokenEmail;
  const email = req.params.email;

  if (email !== decodedEmail) {
    return res.status(403).send({ message: "unauthorized access" });
  }

  try {
    const orders = await orderCollection
      .find({ sellerEmail: email })
      .sort({ _id: -1 })
      .toArray();
    if (!orders.length) {
      return res
        .status(404)
        .send({ message: "No orders found for this email." });
    }

    const fullOrderDetails = await Promise.all(
      orders.map(async (order) => {
        const product = await productCollection.findOne({
          _id: new ObjectId(order.productId),
        });
        if (product) {
          order.productImage = product.image;
          order.productBrand = product.brand;
          order.productName = product.name;
          order.totalPrice = order.quantity * product.price;
        }
        return order;
      })
    );

    res.send(fullOrderDetails);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error retrieving orders" });
  }
};

const createOrder = async (req, res) => {
  const decodedEmail = req.tokenEmail;
  const email = req.params.email;

  if (email !== decodedEmail) {
    return res
      .status(403)
      .json({ success: false, message: "Unauthorized access" });
  }

  const orderData = req.body;
  const { quantity, productId } = orderData;

  try {
    const product = await productCollection.findOne({
      _id: new ObjectId(productId),
    });
    if (!product) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }
    if (quantity < product.min_sell_quantity) {
      return res.status(400).json({
        success: false,
        message: `You need to buy at least ${product.min_sell_quantity} items.`,
      });
    }
    if (product.main_quantity < quantity) {
      return res.status(400).json({
        success: false,
        message: "Too late, this product is out of stock.",
      });
    }
    orderData.date = new Date();
    orderData.sellerEmail = product.sellerEmail;
    const orderResult = await orderCollection.insertOne(orderData);

    if (orderResult.acknowledged) {
      await productCollection.updateOne(
        { _id: new ObjectId(productId) },
        { $inc: { main_quantity: -quantity } }
      );
      return res.status(201).json({
        success: true,
        message: "Order placed successfully",
        orderId: orderResult.insertedId,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to place order. Please try again.",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

const deleteOrder = async (req, res) => {
  const decodedEmail = req.tokenEmail;
  const email = req.query.email;
  const type = req.query.type;

  if (email !== decodedEmail) {
    return res.status(403).send({ message: "unauthorized access" });
  }

  try {
    const id = req.params.id;
    const orderQuery = { _id: new ObjectId(id) };
    const orderDetails = await orderCollection.findOne(orderQuery);
    if (!orderDetails) {
      return res.status(404).send({ message: "Order not found" });
    }

    const productId = orderDetails.productId;
    const quantity = orderDetails.quantity;
    const productQuery = { _id: new ObjectId(productId) };

    const result = await orderCollection.deleteOne(orderQuery);

    if (result.deletedCount && type === "cancel") {
      await productCollection.updateOne(productQuery, {
        $inc: { main_quantity: quantity },
      });
    }

    res.send(result);
  } catch (error) {
    res.status(500).send({ message: "Failed to delete order" });
  }
};

module.exports = {
  setCollections,
  getOrdersByEmail,
  getSellerOrdersByEmail,
  createOrder,
  deleteOrder,
};
