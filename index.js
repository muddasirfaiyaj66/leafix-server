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
mongoose.connect(process.env.DATABASE_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

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

