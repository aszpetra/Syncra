require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');
const Teacher = require('../models/teacher.model');

const client_id = process.env.GOOGLE_CLIENT_ID;
const client = new OAuth2Client(client_id);

async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: client_id,
  });

  const payload = ticket.getPayload();
  console.log('payload:', payload);

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

async function createNewUserLogIn(userData, accessToken, refreshToken) {
  let teacher = await Teacher.findOne({ googleId: userData.id });

  if (!teacher) {
    teacher = new Teacher({
      googleId: userData.id,
      email: userData.email,
      name: userData.name,
      profilePicture: userData.picture,
      accessToken: accessToken,
      refreshToken: refreshToken || null
    });
    await teacher.save();
  } else {
    if (refreshToken) { 
        teacher.refreshToken = refreshToken;
    }
    teacher.accessToken = accessToken;
    await teacher.save();
  }

  return teacher;
}

module.exports = { verifyGoogleToken, createNewUserLogIn };