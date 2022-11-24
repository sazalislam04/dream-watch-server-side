const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
var jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Dream Wathces server running");
});

// mongodb

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.bts619l.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// verify jwt

async function dbConnect() {
  try {
    client.connect();
    console.log("databse connect");
  } catch (error) {
    console.log(error.message);
  }
}
dbConnect();

// user collection
const categoriesCollection = client.db("dream-watch").collection("category");
const usersCollection = client.db("dream-watch").collection("users");

// category
app.get("/categories", async (req, res) => {
  try {
    const query = {};
    const result = await categoriesCollection.find(query).toArray();
    res.send(result);
  } catch (error) {
    console.log(error.message);
  }
});

// jwet
app.get("/jwt", async (req, res) => {
  try {
    const email = req.query.email;
    const query = { email: email };
    const user = await usersCollection.findOne(query);
    if (user) {
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
        expiresIn: "4d",
      });
      return res.send({ accessToken: token });
    }
    res.status(403).send({ message: "Forbidden Access" });
  } catch (error) {
    console.log(error.message);
  }
});

// users
app.post("/users", async (req, res) => {
  try {
    const user = req.body;
    const result = await usersCollection.insertOne(user);
    if (result.insertedId) {
      res.send({
        success: true,
        message: "User Saved Success",
      });
    } else {
      res.send({
        success: false,
        error: error.message,
      });
    }
  } catch (error) {
    console.log(error.message);
  }
});

app.listen(port, () => {
  console.log(`Dream Watches server running on port ${port}`);
});
