require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const cors = require('cors');
const {OAuth2Client} = require('google-auth-library');
const routes = require('./routes/routes');

const app = express();
const client_id = process.env.GOOGLE_CLIENT_ID;
const port =  process.env.PORT;
const mongo_uri = process.env.MONGO_URI;

app.use(express.json());
const client = new OAuth2Client(client_id);

app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

app.use(session({
  secret: 'nagyontitkoskulcs',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24
  }
}));

app.use('/', routes);

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});

mongoose.connect(mongo_uri, {})
  .then(() => console.log('Sikeres kapcsolat a MongoDB-hez'))
  .catch((err) => console.error('Hiba a kapcsolódás során:', err));