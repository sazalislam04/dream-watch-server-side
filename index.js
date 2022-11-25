const express = require("express");
const cors = require("cors");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
var jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;
require("dotenv").config();

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
const productCategories = client.db("dream-watch").collection("categories");

// post all product
app.post("/categories", async (req, res) => {
  const product = req.body;
  const result = await productCategories.insertOne(product, {
    timestamp: new Date(),
  });
  res.send(result);
});
// get product Categories
app.get("/categories", async (req, res) => {
  const query = {};
  const result = await productCategories.find(query).toArray();
  res.send(result);
});

// category detail
app.get("/categories/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: ObjectId(id) };
    const result = await productCategories.findOne(query);
    res.send(result);
  } catch (error) {
    console.log(error.message);
  }
});

// category
// app.get("/categories", async (req, res) => {
//   try {
//     const query = {};
//     const result = await categoriesCollection.find(query).toArray();
//     res.send(result);
//   } catch (error) {
//     console.log(error.message);
//   }
// });

// app.get("/categories/:id", async (req, res) => {
//   try {
//     const { id } = req.params;
//     const query = { _id: ObjectId(id) };
//     const result = await categoriesCollection.findOne(query);
//     res.send(result);
//   } catch (error) {
//     console.log(error.message);
//   }
// });

// users
app.get("/jwt", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);

  if (user) {
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
      expiresIn: "1d",
    });
    console.log(token);
    return res.send({ accessToken: token });
  }
  res.status(403).send({ accessToken: "Forbidden Access" });
});

// user
app.post("/users", async (req, res) => {
  const user = req.body;
  const result = await usersCollection.insertOne(user);
  res.send(result);
});

// get seller user
app.get("/users/seller", async (req, res) => {
  const sellers = await usersCollection.find({ role: "Seller" }).toArray();
  res.send(sellers);
});

// delete seller user
app.delete("/users/seller/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
});

// get buyer user
app.get("/users/buyer", async (req, res) => {
  const buyers = await usersCollection.find({ role: "Buyers" }).toArray();
  res.send(buyers);
});

// delete buyer user
app.delete("/users/buyer/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
});

// admin route
app.get("/users/admin/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await usersCollection.findOne(query);
  res.send({ isAdmin: user?.role === "admin" });
});

app.put("/users/admin/:id", async (req, res) => {
  // const decodedEmail = req.decoded.email;
  // const query = { email: email };
  // const user = await usersCollection.findOne(query);

  // if (user?.role !== "admin") {
  //   return res.status(403).send({ message: "Forbidden access" });
  // }
  const { id } = req.params;
  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: "admin",
    },
  };
  const result = await usersCollection.updateOne(filter, updatedDoc, options);
  res.send(result);
});

// seller route
app.get("/users/seller/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await usersCollection.findOne(query);
  res.send({ isSeller: user?.role === "Seller" });
});

app.listen(port, () => {
  console.log(`Dream Watches server running on port ${port}`);
});
