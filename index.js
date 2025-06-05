const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to BulkNEST Server");
});

app.listen(port, () => {
  console.log(`Server Running on http://localhost:${port}`);
});
