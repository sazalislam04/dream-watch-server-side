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
const categoriesCollection = client.db("dream-watch").collection("allCategory");
const usersCollection = client.db("dream-watch").collection("users");
const productsCollection = client.db("dream-watch").collection("products");
const bookingsCollection = client.db("dream-watch").collection("bookings");
const reportsCollection = client.db("dream-watch").collection("reports");
const wishlistCollection = client.db("dream-watch").collection("wishlist");
const advertiseCollection = client.db("dream-watch").collection("advertise");

// all category
app.get("/category", async (req, res) => {
  const query = {};
  const result = await categoriesCollection.find(query).toArray();
  res.send(result);
});

// post all product
app.post("/category-products", async (req, res) => {
  const product = req.body;
  const result = await productsCollection.insertOne(product, {
    timestamp: new Date(),
  });
  res.send(result);
});

// category detail
app.get("/category/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: ObjectId(id) };
    const category = await categoriesCollection.findOne(query);

    const result = await productsCollection
      .find({ category_name: category.category_name })
      .toArray();

    res.send({ result, category });
  } catch (error) {
    console.log(error.message);
  }
});

app.get("/products", async (req, res) => {
  const email = req.query.email;
  const filter = { email: email };
  const result = await productsCollection.find(filter).toArray();
  res.send(result);
});

// delete product
app.delete("/products/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await productsCollection.deleteOne(query);
  res.send(result);
});

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

// buyer route
app.get("/users/buyer/:email", async (req, res) => {
  const email = req.params.email;
  const query = { email };
  const user = await usersCollection.findOne(query);
  res.send({ isBuyer: user?.role === "Buyers" });
});

// booking api
app.post("/bookings", async (req, res) => {
  const booking = req.body;
  const query = {
    price: booking.price,
    email: booking.email,
    productName: booking.productName,
  };
  const alreadyBooked = await bookingsCollection.find(query).toArray();
  if (alreadyBooked.length) {
    const message = `You Already booking: ${booking.name}`;
    return res.send({
      acknowledged: false,
      message,
    });
  }
  const result = await bookingsCollection.insertOne(booking);
  res.send(result);
});

// get booking data
app.get("/bookings", async (req, res) => {
  const email = req.query.email;
  const filter = { email: email };
  const result = await bookingsCollection.find(filter).toArray();
  res.send(result);
});

// delete booking
app.delete("/bookings/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await bookingsCollection.deleteOne(query);
  res.send(result);
});

// report admin route
app.post("/reports", async (req, res) => {
  const report = req.body;
  const query = {
    name: report.name,
    email: report.email,
  };

  const alreadyReported = await reportsCollection.find(query).toArray();
  if (alreadyReported.length) {
    const message = `You Already Repoted`;
    return res.send({
      acknowledged: false,
      message,
    });
  }
  const result = await reportsCollection.insertOne(report);
  res.send(result);
});

app.get("/reports", async (req, res) => {
  const query = {};
  const result = await reportsCollection.find(query).toArray();
  res.send(result);
});

// add wishlist
app.post("/wishlist", async (req, res) => {
  const wishlist = req.body;

  const query = {
    product: wishlist.product,
  };

  console.log(wishlist);
  const alreadyWish = await wishlistCollection.find(query).toArray();
  console.log(alreadyWish);

  if (alreadyWish.length) {
    const message = `You Already Added Wishlist`;
    return res.send({
      acknowledged: false,
      message,
    });
  }
  const result = await wishlistCollection.insertOne(wishlist);
  res.send(result);
});

app.get("/wishlist", async (req, res) => {
  const email = req.query.email;
  const filter = { userEmail: email };
  const result = await wishlistCollection.find(filter).toArray();
  res.send(result);
});

// delete wishlist
app.delete("/wishlist/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await wishlistCollection.deleteOne(query);
  res.send(result);
});

app.listen(port, () => {
  console.log(`Dream Watches server running on port ${port}`);
});
