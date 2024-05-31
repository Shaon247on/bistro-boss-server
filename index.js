const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const app = express()
require('dotenv').config()
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
const cors = require('cors');
const port = process.env.PORT || 5000


//middleware

app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.BD_PASS}@cluster0.k4uag68.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('bistroDB').collection('users')
    const menuCollection = client.db('bistroDB').collection('menu')
    const reviewCollection = client.db('bistroDB').collection('reviews')
    const cartsCollection = client.db('bistroDB').collection('carts')

    // JET related API

    app.post('/jwt', async (req, res) => {
      const user = req.body
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "1h" })
      res.send({ token })
    })


    // verify token middlewares
    const verifyToken = (req, res, next) => {
      console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'Unauthorized Access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded
        next()
      })
    }

    // use Verify admin after verifyToken 
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email
      const query = { email: email }
      const result = await userCollection.findOne(query)
      const isAdmin = result?.role === 'admin'
      if (!isAdmin) {
        return res.status(403).send({ message: "Forbidden Access" })
      }
      next()
    }

    // users related API

    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      console.log(req.headers)
      const result = await userCollection.find().toArray()
      res.send(result)
    })

    app.get('/users/admin/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: 'Forbidden Access' })
      }
      const query = { email: email }
      const user = await userCollection.findOne(query)
      let admin = false
      if (user) {
        admin = user?.role === 'admin'
      }
      console.log(admin)
      res.send({ admin })
    })

    app.post('/users', async (req, res) => {
      const users = req.body
      // insert email if user don't exists
      //3 ways to do that, (1. email unique, 2. upsert, 3. simple checking)
      const query = { email: users.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }
      const result = await userCollection.insertOne(users)
      res.send(result)
    })


    // Menu related APIs
    app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await userCollection.deleteOne(query)
      res.send(result)
    })

    // Admin related API

    app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          role: 'admin'
        }
      }
      const result = await userCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    // update cart count

    app.post('/carts', async (req, res) => {
      const cartItem = req.body
      const result = await cartsCollection.insertOne(cartItem)
      res.send(result)
    })

    //get user carted item

    app.get("/carts", async (req, res) => {
      const email = req.query.email
      const query = { email: email }
      const result = await cartsCollection.find(query).toArray()
      res.send(result)
    })

    //delete a single cart item

    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      console.log(query)
      const result = await cartsCollection.deleteOne(query)
      res.send(result)
    })


    // payment intent

    app.post('/create-payment-intent', async (req, res)=>{
      const {price} = req.body
      const amount = parseInt(price * 100)
      console.log('amount inside intent', amount)
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types:['card']
      })
      res.send({
        clientSecret: paymentIntent.client_secret
      })

    })


    //to get all data of menu from mongoDB

    app.get('/menu', async (req, res) => {
      const result = await menuCollection.find().toArray()
      res.send(result)
    })

    app.get('/menu/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.findOne(query)
      res.send(result)
    })

    app.patch('/menu/:id', async(req, res)=>{
      const id = req.params.id
      const item = req.body
      const filter = {_id: new ObjectId(id)}
      const updatedDoc = {
        $set:{
          name: item.name,
          category: item.category,
          price: item.price,
          recipe: item.recipe,
          image: item.image
        }
      }
      const result = await menuCollection.updateOne(filter, updatedDoc)
      res.send(result)
    })

    app.post('/menu', verifyToken, verifyAdmin, async (req, res) => {
      const item = req.body
      const result = await menuCollection.insertOne(item)
      res.send(result)
    })

    app.delete('/menu/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await menuCollection.deleteOne(query)
      res.send(result)
    })

    //to get all data of review from mongoDB

    app.get('/reviews', async (req, res) => {
      const result = await reviewCollection.find().toArray()
      res.send(result)
    })


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('boss is Sitting')
})
app.listen(port, () => {
  console.log(`bistro boss is sitting ${port}`)
})


/**
 *                ---------------------
 *                  NAMING CONVENTION
 *                ---------------------
 * app.get('/users')
 * app.get
 * 
 * 
 * 
*/