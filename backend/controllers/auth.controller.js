require("dotenv").config();
const axios = require("axios");
const { google } = require("googleapis");
const Teacher = require("../models/teacher.model");

const client_id = process.env.GOOGLE_CLIENT_ID;
const client_secret = process.env.GOOGLE_CLIENT_SECRET;
const redirect_uri = process.env.REDIRECT_URI;

const oauth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uri
);

async function getGoogleUserInfo(accessToken) {
  const response = await axios.get(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  return response.data;
}

async function getCalendarEvents(accessToken) {
  const now = new Date();
  const response = await axios.get(
    "https://www.googleapis.com/calendar/v3/calendars/primary",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      params: {
        timeMin: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        maxResults: 20,
        singleEvents: true,
        orderBy: "startTime",
      },
    }
  );

  return response.data.items;
}

async function handleGoogleLogin(req, res) {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log(tokens);
    const access_token = tokens.access_token;

    /*
    let teacher = await Teacher.findOne({ googleId: userData.sub });
    if(!teacher) {
        teacher = new Teacher({
            googleId: userData.sub,
            email: userData.email,
            name: userData.name,
            picture: userData.picture
        });

        await teacher.save;
    }
    */
    req.session.token = access_token;
    res.redirect("http://localhost:4200/dashboard");
  } catch (error) {
    console.error("Google auth failed:", error);
    res.status(401).json({ message: "Invalid token" });
  }
}

async function handleDataRequestFromGoogle(req, res) {
  const access_token = req.session.accessToken;
  //const userData = await getGoogleUserInfo(access_token);
  //console.log(userData);

  const calendarData = await getCalendarEvents(access_token);
  console.log(calendarData);

  res.status(200).json({ user: userData, calendar: calendarData });
}

module.exports = { handleGoogleLogin, handleDataRequestFromGoogle };
