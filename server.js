require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo').default;
const cors = require('cors');
const routes = require('./routes/routes');

const app = express();
const port =  process.env.PORT;
const mongo_uri = process.env.MONGO_URI;
const isProduction = process.env.NODE_ENV === 'production';

app.use(express.json());

app.use(cors({
  origin: 'https://lively-klepon-74f07b.netlify.app/',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60
  }),
  cookie: {
    httpOnly: true,
    secure: isProduction,
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