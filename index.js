const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config()


const app = express();
const port = process.env.PORT



app.use(cors());
app.use(bodyParser.json());

//mongoDb database connection
mongoose.connect(process.env.DATABASE_URL)


//product schema 

const productSchema = new mongoose.Schema({
  title: String,
  price: Number,
  quantity: Number,
  description: String,
  rating: Number,
  image: String,
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },


});

const categorySchema = new mongoose.Schema({
  name: { type: String, unique: true, required: true },
});

const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);
//* Category Api'S

//!Post Api for category
app.post('/api/v1/categories', async (req, res) => {
  try {
    const { name } = req.body;
    const existingCategory = await Category.findOne({ name })
    if (existingCategory) {
      return res.status(409).json({ message: 'Category already exists' });
    }
    const result = await Category.create({ name })
    res.status(201).json(result);

  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});


//! get api for category

app.get('/api/v1/categories', async (req, res) => {
  try {
    const result = await Category.find()
    res.status(201).json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
})


//* Product Api'S

//? Create a product

app.post('/api/v1/products', async (req, res) => {
  try {
    const body = req.body;
    const category = body.category;
    const existingCategory = await Category.findById(category);
    if (!existingCategory) {
      return res.status(400).json({ message: 'Invalid category' });
    }
    const result = await Product.create(body)
    res.status(201).json(result);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

//get all products

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
    }
    if (category) {
      query.category = category;

    }

    const totalProducts = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category')
      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber)
      .exec()
    const meta = {
      totalItems: totalProducts,
      currentPage: pageNumber,
      totalPages: Math.ceil(totalProducts / limitNumber),
      itemsPerPage: limitNumber
    };

    res.json({ meta, products })
  } catch (err) {
    res.status(500).json({ message: err.message })
  }
});

//!get single product api

app.get('/api/v1/products/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//!update product

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

//!delete a product 

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
})

app.get('/', (req, res) => {
  res.send(`
          <div style="display: flex; justify-content: center; align-items: center; text-align: center;color:white;background-color:black; height:100vh; width:full">
            <div>
            <h1 >Welcome to <span style="color:yellow">Leafix</span> <span style="color:#ff0000">Server</span> 😊</h1>
            <p>This is the API server for <span style="color:#4ef037">Leafix</span> application.</p>
            </div>
          </div>
      
      `);
});

// Start server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});

