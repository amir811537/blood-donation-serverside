const express = require("express");
const app = express();
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@hotelhaven-database.n0h5vlk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}

const userCollection = client.db("BloodDonation").collection("users");
const donationCollection = client.db("BloodDonation").collection("donation");
const blogCollection = client.db("BloodDonation").collection("blogs");
// blog post api
app.post('/blogs',async(req,res)=>{
  const blog=req.body;
  const result=await blogCollection.insertOne(blog);
  res.send(result)
})

// jwt related api
app.post("/jwt", async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "2h",
  });
  res.send({ token });
});
// middleware
const verifyToken = (req, res, next) => {
  console.log("inside verify token", req.headers.authorization);
  if (!req.headers.authorization) {
    return res.status(401).send({ message: "forbidden access" });
  }
  const token = req.headers.authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: "forbided access" });
    }
    console.log(decoded)
    req.decoded = decoded;
    next();
  });
};

// blood donation related api
app.post("/donation", async (req, res) => {
  const donor = req.body;
  const result = await donationCollection.insertOne(donor);
  res.send(result);
});



// get the donation request
app.get("/donation", async (req, res) => {
  const result = await donationCollection.find().toArray();
  res.send(result);
});
// delete the donation req
app.delete("/donation/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await donationCollection.deleteOne(query);
  res.send(result);
});
// get donation by id
app.get("/donation/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await donationCollection.findOne(query);
  res.send(result);
});

// PATCH endpoint to update a donation request
app.patch("/donation/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };

    // Assuming req.body contains the fields you want to update
    const updateFields = { $set: req.body };

    const result = await donationCollection.updateOne(query, updateFields);

    if (result.modifiedCount > 0) {
      res
        .status(200)
        .send({ message: "Donation request updated successfully." });
    } else {
      res.status(404).send({ error: "Donation request not found." });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: "Internal server error." });
  }
});

// User related api

// get the user

// admin api
app.get("/users/admin/:email", verifyToken, async (req, res) => {
  const email = req.params.email;
  if (email !== req.decoded.email) {
    return res.status(403).send({
      message: "unauthorized access"});
  }
  const query={email:email};
  const user=await userCollection.findOne(query);
  let admin=false;
  if(user){
    admin=user?.role=== 'admin'
  }
  res.send({admin})

});

app.get("/users", verifyToken, async (req, res) => {
  // console.log(req.headers);
  const result = await userCollection.find().toArray();
  res.send(result);
});

// user added to mongobd
app.post("/users", async (req, res) => {
  const user = req.body;
  // insert email if user doesnt exists

  // you can do this many ways(1.email unique ,2.upsert,3.simple checking )

  const query = { email: user.email };
  const existingUser = await userCollection.findOne(query);
  if (existingUser) {
    return res.send({ message: "user already exists", insertedId: null });
  }

  const result = await userCollection.insertOne(user);
  res.send(result);
});

// user delete api
app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await userCollection.deleteOne(query);
  res.send(result);
});

// make adminand volunteer  api
app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: "admin",
    },
  };
  const result = await userCollection.updateOne(filter, updatedDoc, options);
  res.send(result);
});
// Make user a volunteer API
app.patch("/users/volunteer/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: new ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: "volunteer",
    },
  };
  const result = await userCollection.updateOne(filter, updatedDoc, options);
  res.send(result);
});

app.patch("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };

  try {
    // Assuming req.body contains the fields you want to update
    const updatedData = req.body;

    // Update the user information in the database
    const result = await userCollection.updateOne(query, { $set: updatedData });

    if (result.modifiedCount > 0) {
      res.send({ message: "User updated successfully" });
    } else {
      res.status(404).send({ message: "User not found or no updates applied" });
    }
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

app.get("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await userCollection.findOne(query);
  res.send(result);
});

run().catch(console.dir);

app.get("/", (req, res) => {
  res.send(" blood  donation is running.......");
});

app.listen(port, () => {
  console.log(`blood bonation server is running on the port ${port}`);
});
