require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const stripe = require("stripe")(`${process.env.STRIPE_SECRET_KEY}`)


const app = express();
const port = process.env.PORT;

app.use(cors());
app.use(bodyParser.json());

// MongoDB database connection
mongoose.connect(process.env.DATABASE_URL);

// Product schema 
const productSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,  
    trim: true,    
  },
  price: {
    type: Number,
    required: true,
    min: 0,  
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,  
    default: 0,  
  },
  description: {
    type: String,
    trim: true,  
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,  
  },
  image: {
    type: String,
    required: true,  
  },
  category: {
    type: String,
    required: true,  
  }
},{ timestamps: true });

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


app.post('/api/v1/checkout', async (req, res) => {
  const { token, amount, email, cartItems } = req.body; 

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "usd",
      payment_method_data: {
        type: 'card',
        card: {
          token: token,
        },
      },
    });
    
    

    const productDetails = cartItems.map(item => {
      return `${item.title} (Quantity: ${item.quantity}, Price: $${item.price})`;
    }).join('\n');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Payment Confirmation',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f4f4f4; border-radius: 5px;">
          <h2 style="color: #333;">Thank You for Your Purchase!</h2>
          <p style="color: #555;">Your payment of <strong>$${(amount / 100).toFixed(2)}</strong> was successful!</p>
    
          <h3 style="color: #333;">Order Summary</h3>
          <div style="margin-bottom: 20px; border: 1px solid #ddd; border-radius: 5px; padding: 10px; background-color: #fff;">
            ${cartItems.map(item => `
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <img src="${item.image}" alt="${item.title}" style="width: 60px; height: 60px; border-radius: 5px; margin-right: 10px;">
                <div>
                  <h4 style="margin: 0; color: #333;">${item.title}</h4>
                  <p style="margin: 0; color: #555;">Quantity: ${item.quantity}</p>
                  <p style="margin: 0; color: #555;">Price: $${item.price.toFixed(2)}</p>
                </div>
              </div>
            `).join('')}
          </div>
    
          <p style="color: #555;">If you have any questions, feel free to contact us at <a href="mailto:${process.env.EMAIL_USER}" style="color: #007bff;">${process.env.EMAIL_USER}</a>.</p>
          
          <footer style="margin-top: 20px; text-align: center; color: #555;">
            <img src="https://i.ibb.co.com/R2S8yg6/leafixM.png" alt="Leafix Logo" style="width: 100px; height: auto;">
            <p style="margin: 0;">© 2024 Leafix. All rights reserved.</p>
          </footer>
        </div>
      `,
    };
    

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email sending failed:', err);
      } else {
        console.log('Email sent:', info.response);
      }
    });

    res.status(200).json({ success: true, clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Payment failed:', error);
    res.status(500).json({ message: 'Payment failed.' });
  }
});


app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
