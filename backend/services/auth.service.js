require('dotenv').config();
const { OAuth2Client } = require('google-auth-library');

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

module.exports = { verifyGoogleToken };