const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const Stripe = require('stripe');
const stripe = Stripe(`${process.env.STRIPE_SECRET_KEY}`);
require('dotenv').config();

const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());

// MongoDB database connection
mongoose.connect(process.env.DATABASE_URL);

// Product schema 
const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  quantity: Number,
  description: String,
  rating: Number,
  image: String,
  category: String, 
});

const Product = mongoose.model('Product', productSchema);

//* Product APIs

//? Create a product
app.post('/api/v1/products', async (req, res) => {
  try {
    const body = req.body;
    const result = await Product.create(body);
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//? Get all products with filters and pagination
app.get('/api/v1/products', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search = '',
      category = '',   
      minPrice = 0,
      maxPrice = Number.MAX_SAFE_INTEGER
    } = req.query;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const minPriceNumber = parseFloat(minPrice);
    const maxPriceNumber = parseFloat(maxPrice);

    const query = {
      title: { $regex: search, $options: 'i' },
      price: { $gte: minPriceNumber, $lte: maxPriceNumber }
    };
    
    if (category) {
      query.category = category;  
    }

    const totalProducts = await Product.countDocuments(query);

    const products = await Product.find(query)
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .exec();

    const meta = {
      totalItems: totalProducts,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      itemsPerPage: limitNumber
    };

    res.json({ meta, products });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//! Get single product by ID
app.get('/api/v1/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//! Update a product
app.put('/api/v1/products/:id', async (req, res) => {
  try {
    const updatedData = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//! Delete a product
app.delete('/api/v1/products/:id', async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send(`
          <div style="display: flex; justify-content: center; align-items: center; text-align: center;color:white;background-color:black; height:100vh; width:full">
            <div>
            <h1>Welcome to <span style="color:yellow">Leafix</span> <span style="color:#ff0000">Server</span> 😊</h1>
            <p>This is the API server for <span style="color:#4ef037">Leafix</span> application.</p>
            </div>
          </div>
      `);
});

// Handle payment
app.post('/api/v1/checkout', async (req, res) => {
  const { token, amount } = req.body;

  try {
    const charge = await stripe.charges.create({
      amount,
      currency: 'usd',
      description: 'Online Nursery Order',
      source: token,
    });
    res.status(200).json({ success: true, charge });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
