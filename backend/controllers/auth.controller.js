require("dotenv").config();
const axios = require("axios");
const { google } = require("googleapis");
const { createNewUserLogIn } = require('../services/auth.service');

const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
);

google.options({
  auth: oauth2Client
});

async function getGoogleUserInfo(authClient) {
  const oauth2 = google.oauth2({
    auth: authClient,
    version: 'v2'
  });
  const { data } = await oauth2.userinfo.get();
  return data;
}

async function getCalendarEvents(authClient) {
  const calendar = google.calendar({ version: 'v3', auth: authClient });
  const oneWeekInMilisec = 7 * 24 * 60 * 60 * 1000;

	const res = await calendar.events.list({
    calendarId: 'primary',
    maxResults: 20,
    timeMin: (new Date(Date.now() - oneWeekInMilisec)).toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });
  return res.data.items;
}

async function handleGoogleLogin(req, res) {
  const code = req.query.code;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    const requestClient = new google.auth.OAuth2(client_id, client_secret, redirect_uri);
    requestClient.setCredentials(tokens);
    const access_token = tokens.access_token;
    const refresh_token = tokens.refresh_token;

    const userData = await getGoogleUserInfo(requestClient);
    const currentUser = await createNewUserLogIn(userData, access_token, refresh_token);

    req.session.tokens = tokens; 
    req.session.user = userData;
    if (tokens.refresh_token) {
      req.session.refreshToken = tokens.refresh_token;
    }
    req.session.user = currentUser;

    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ message: "Internal server error" });
      }
      res.redirect('http://localhost:4200/dashboard');
    });
  } catch (error) {
    console.error("Google auth failed:", error);
    res.status(401).json({ message: "Invalid token" });
  }
}

async function getAuthenticatedClient(req) {

  if (!req.session || !req.session.tokens) {
    console.error('Nincs session token (valószínűleg nincs bejelentkezve)');
    throw new Error('Nincs session token');
  }

  const requestClient = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  );
  requestClient.setCredentials(req.session.tokens);
  try {
    const tokenResponse = await requestClient.getAccessToken();
    const newAccessToken = tokenResponse?.token || requestClient.credentials?.access_token;

    if (newAccessToken && req.session.tokens.access_token &&
        newAccessToken !== req.session.tokens.access_token) {
      console.log('Google token frissítve.');
      req.session.tokens.access_token = newAccessToken;

      await new Promise((resolve, reject) => {
        req.session.save(err => (err ? reject(err) : resolve()));
      });
    }
    
    return requestClient;

  } catch (error) {
    console.error('Hiba a token frissítése közben:', error.message);
    throw new Error('Token frissítési hiba');
  }
}

async function handleDataRequestFromGoogle(req, res) {
	try {
    const authClient = await getAuthenticatedClient(req);
    const calendarData = await getCalendarEvents(authClient);
    
    console.log('Naptár adatok sikeresen lekérve', calendarData);

    res.status(200).json({ calendar: calendarData });

  } catch (error) {
    console.error('Hiba a Google adatok lekérése közben:', error.message);
    
    if (error.message.includes('token')) {
      return res.status(401).json({ message: 'Nincs bejelentkezve (session lejárt vagy token hiba)' });
    }
    res.status(500).json({ message: 'Szerver hiba az adatlekérés közben' });
  }
}

async function handleLogout(req, res) {};

async function getTeacherIdForLink(req, res) {
    if (!req.session.user || !req.session.user._id) {
        return res.status(401).json({ message: 'Not authenticated.' });
    }
    res.status(200).json({ teacherId: req.session.user._id });
}

module.exports = { handleGoogleLogin, handleDataRequestFromGoogle, handleLogout, getTeacherIdForLink };