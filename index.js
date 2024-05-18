const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express()
require('dotenv').config()
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

    const menuCollection = client.db('bistroDB').collection('menu')
    const reviewCollection = client.db('bistroDB').collection('reviews')


    //to get all data of menu from mongoDB

    app.get('/menu', async(req,res)=>{
        const result = await menuCollection.find().toArray()
        res.send(result)
    })

    //to get all data of review from mongoDB

    app.get('/reviews', async(req,res)=>{
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


app.get('/', (req, res)=>{
    res.send('boss is Sitting')
})
app.listen(port, ()=>{
    console.log(`bistro boss is sitting ${port}`)
})