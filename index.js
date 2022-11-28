const express = require("express");
const cors = require("cors");
const app = express();
var jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId, Admin } = require("mongodb");
const port = process.env.PORT || 5000;
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_KEY);

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
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(401).send({ message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
}

// verify admin
async function verifyAdmin(req, res, next) {
  const decodedEmail = req.decoded.email;
  const user = await usersCollection.findOne({ email: decodedEmail });
  if (user?.role !== "admin") {
    res.status(403).send({ message: "Forbidden access" });
  }
  next();
}

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
const paymentsCollection = client.db("dream-watch").collection("payments");

// all category
app.get("/category", async (req, res) => {
  const query = {};
  const result = await categoriesCollection.find(query).toArray();
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

// post all product
app.post("/products", verifyJWT, async (req, res) => {
  const product = req.body;
  const result = await productsCollection.insertOne(product, {
    timestamp: new Date().toLocaleString(),
  });
  res.send(result);
});

app.get("/products", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    return res.status(403).send({ message: "Forbidden access" });
  }
  const filter = { email: email };
  const result = await productsCollection.find(filter).toArray();
  res.send(result);
});

// delete product
app.delete("/products/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await productsCollection.deleteOne(query);
  res.send(result);
});

// advertise
app.patch("/advertise/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const { isAdvertise } = req.body;
  const updatedDoc = {
    $set: {
      isAdvertise: isAdvertise,
    },
  };

  const result = productsCollection.updateOne(query, updatedDoc);
  res.send(result);
});

app.get("/advertise", async (req, res) => {
  const result = await productsCollection
    .find({ isAdvertise: true, available: true })
    .toArray();
  res.send(result);
});

// jwt
app.get("/jwt", async (req, res) => {
  const email = req.query.email;
  const query = { email: email };
  const user = await usersCollection.findOne(query);
  if (user) {
    const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, {
      expiresIn: "5s",
    });

    return res.send({ accessToken: token });
  }
  res.status(403).send({ accessToken: "Forbidden Access" });
});

// Save user email & generate JWT
app.put("/users/:email", async (req, res) => {
  const email = req.params.email;
  const user = req.body;
  const filter = { email: email };
  const options = { upsert: true };
  const updateDoc = {
    $set: user,
  };
  const result = await usersCollection.updateOne(filter, updateDoc, options);

  const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
    expiresIn: "1d",
  });

  res.send({ result, token });
});

// get all user
app.get("/users", verifyJWT, async (req, res) => {
  const query = {};
  const result = await usersCollection.find(query).toArray();
  res.send(result);
});

// delete user
app.delete("/users/:id", async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
});

// verify user status
app.patch("/verify-status/:email", async (req, res) => {
  const verifyStatus = await productsCollection.updateMany(
    { email: req.params.email },
    {
      $set: {
        status: true,
      },
    }
  );
  const result = await usersCollection.updateOne(
    { email: req.params.email },
    {
      $set: req.body,
    }
  );
  res.send(result);
});

// get seller user
app.get("/users/seller", verifyJWT, async (req, res) => {
  const sellers = await usersCollection.find({ role: "Seller" }).toArray();
  res.send(sellers);
});

// delete seller user
app.delete("/users/seller/:id", verifyJWT, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
});

// get buyer user
app.get("/users/buyer", verifyJWT, async (req, res) => {
  const buyers = await usersCollection.find({ role: "Buyers" }).toArray();
  res.send(buyers);
});

// delete buyer user
app.delete("/users/buyer/:id", verifyJWT, verifyAdmin, async (req, res) => {
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

app.put("/users/admin/:id", verifyJWT, async (req, res) => {
  const decodedEmail = req.decoded.email;
  const query = { email: decodedEmail };
  const user = await usersCollection.findOne(query);

  if (user?.role !== "admin") {
    return res.status(403).send({ message: "Forbidden access" });
  }
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
app.get("/bookings", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const decodedEmail = req.decoded.email;
  if (email !== decodedEmail) {
    return res.status(403).send({ message: "Forbidden access" });
  }
  const filter = { email: email };
  const result = await bookingsCollection.find(filter).toArray();
  res.send(result);
});

app.get("/bookings/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;
  const result = await bookingsCollection.findOne({ _id: ObjectId(id) });
  res.send(result);
});

// delete booking
app.delete("/bookings/:id", verifyJWT, async (req, res) => {
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

app.get("/reports", verifyJWT, async (req, res) => {
  const query = {};
  const result = await reportsCollection.find(query).toArray();
  res.send(result);
});

// delete report
app.delete("/reports/:id", verifyJWT, verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const deletedReport = await productsCollection.deleteOne({
    _id: ObjectId(id),
  });
  const result = await reportsCollection.deleteOne({ _id: id });
  res.send(result);
});

// add wishlist
app.post("/wishlist", async (req, res) => {
  const wishlist = req.body;

  const query = {
    product: wishlist.product,
  };
  const alreadyWish = await wishlistCollection.find(query).toArray();
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

app.get("/wishlist", verifyJWT, async (req, res) => {
  const email = req.query.email;
  const filter = { userEmail: email };
  const result = await wishlistCollection.find(filter).toArray();
  res.send(result);
});

// delete wishlist
app.delete("/wishlist/:id", verifyJWT, async (req, res) => {
  const { id } = req.params;
  const query = { _id: ObjectId(id) };
  const result = await wishlistCollection.deleteOne(query);
  res.send(result);
});

// payment
app.post("/create-payment-intent", verifyJWT, async (req, res) => {
  const booking = req.body;
  const price = booking.price;
  const amount = price * 100;

  const paymentIntent = await stripe.paymentIntents.create({
    currency: "usd",
    amount: amount,
    payment_method_types: ["card"],
  });
  res.send({
    clientSecret: paymentIntent.client_secret,
  });
});

app.put("/payment", verifyJWT, async (req, res) => {
  const payment = req.body;
  const result = await paymentsCollection.insertOne(payment);
  const id = payment.bookingId;
  const productId = payment.productId;
  const query = { _id: ObjectId(productId) };
  const filter = { _id: ObjectId(id) };
  const updatedDoc = {
    $set: {
      paid: true,
      transactionId: payment.transactionId,
    },
  };
  const productUpdatedDoc = {
    $set: {
      available: false,
    },
  };
  const updatedProductsCollection = await productsCollection.updateOne(
    query,
    productUpdatedDoc
  );
  const updatedPaymentStatus = await bookingsCollection.updateOne(
    filter,
    updatedDoc
  );

  res.send(result);
});

app.listen(port, () => {
  console.log(`Dream Watches server running on port ${port}`);
});
