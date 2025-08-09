const { ObjectId } = require("mongodb");

let userCollection = null;

// Set the user collection instance
function setUserCollection(collection) {
  userCollection = collection;
}

// Create or update user
const createUser = async (req, res) => {
  try {
    if (!userCollection) {
      return res.status(500).json({ error: "User collection not initialized" });
    }
    const userData = req.body;
    const query = {
      email: userData.email,
    };
    // check user exists or not
    const alreadyExists = await userCollection.findOne(query);
    if (!!alreadyExists) {
      //updating user last loggedIn status
      const result = await userCollection.updateOne(query, {
        $set: { lastLoggedIn: new Date().toISOString() },
      });
      return res.send(result);
    } else {
      //user creating
      userData.role = "customer";
      userData.createdAt = new Date().toISOString();
      userData.lastLoggedIn = new Date().toISOString();
      const result = await userCollection.insertOne(userData);
      res.status(201).json(result);
    }
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

module.exports = {
  setUserCollection,
  createUser,
};
