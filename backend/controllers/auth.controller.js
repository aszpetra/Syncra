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

	const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: (new Date()).toISOString(), 
    maxResults: 20,
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

    const userData = await getGoogleUserInfo(requestClient);
    const currentUser = await createNewUserLogIn(userData, access_token);

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
  if (!req.session.tokens) {
    throw new Error('Nincs session token');
  }
  const requestClient = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uri
  );
  requestClient.setCredentials(req.session.tokens);
  try {
    await requestClient.getAccessToken();
    if (requestClient.credentials.access_token !== req.session.tokens.access_token) {
      console.log('Google token frissítve.');
      req.session.tokens = requestClient.credentials;

      await new Promise((resolve, reject) => {
        req.session.save(err => err ? reject(err) : resolve());
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
    // 1. LÉPÉS: Kérj egy hitelesített klienst.
    // Ez a függvény elvégzi a "piszkos munkát":
    // - Megnézi, van-e session.
    // - Létrehozza a klienst a tokenekkel.
    // - FRISSÍTI a tokent, ha lejárt.
    // - Elmenti a frissített tokent a session-be.
    const authClient = await getAuthenticatedClient(req);

    // 2. LÉPÉS: Használd a friss klienst az adatlekéréshez.
    // A 'getGoogleUserInfo' és 'getCalendarEvents' már helyesen
    // egy 'authClient' objektumot várnak, nem egy token stringet.
    const userData = await getGoogleUserInfo(authClient);
    const calendarData = await getCalendarEvents(authClient);
    
    console.log('Naptár adatok sikeresen lekérve');

    // 3. LÉPÉS: Küldd vissza az adatot
    res.status(200).json({ calendar: calendarData });

  } catch (error) {
    // Ha 'getAuthenticatedClient' hibát dobott (pl. nincs session,
    // vagy a refresh token is lejárt), az is ide fog kerülni.
    console.error('Hiba a Google adatok lekérése közben:', error.message);
    
    if (error.message.includes('token')) {
      // Pl. "Nincs session token" vagy "Token frissítési hiba"
      return res.status(401).json({ message: 'Nincs bejelentkezve (session lejárt vagy token hiba)' });
    }
    
    // Egyéb hiba (pl. Google API hiba)
    res.status(500).json({ message: 'Szerver hiba az adatlekérés közben' });
  }
}

module.exports = { handleGoogleLogin, handleDataRequestFromGoogle };
