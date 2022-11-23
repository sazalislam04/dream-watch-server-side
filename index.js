const express = require("express");
const cors = require("cors");
require("dotenv").config();
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Dream Wathces server running");
});

app.listen(port, () => {
  console.log(`Dream Watches server running on port ${port}`);
});
