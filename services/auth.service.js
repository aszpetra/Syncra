require('dotenv').config();
const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const { getUserByGoogleId, getUserRefreshToken, createUser } = require('./db.service');

const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const client = new OAuth2Client(client_id);

async function getGoogleClientAndRefreshToken(teacherId) {
    const teacher = await getUserRefreshToken(teacherId);

    if (!teacher || !teacher.refreshToken) {
        throw new Error('Teacher not found or missing refresh token in database. Cannot authenticate Google client.');
    }
    
    const oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret
    );
    
    oauth2Client.setCredentials({
        refresh_token: teacher.refreshToken,
    });

    try {
        const { credentials } = await oauth2Client.refreshAccessToken();

        oauth2Client.setCredentials(credentials); 
        
        return oauth2Client; 

    } catch (error) {
        console.error('Failed to refresh access token for teacher:', teacherId, error.message);
        throw new Error(error.message);
    }
}

async function verifyGoogleToken(idToken) {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: client_id,
  });
  const payload = ticket.getPayload();

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    picture: payload.picture,
  };
}

async function createNewUserLogIn(userData, accessToken, refreshToken) {
  let teacher = await getUserByGoogleId(userData.id);

  if (!teacher) {
    teacher = createUser(userData, accessToken, refreshToken);
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

module.exports = { verifyGoogleToken, createNewUserLogIn, getGoogleClientAndRefreshToken };