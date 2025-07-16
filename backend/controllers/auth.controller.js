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

google.options({
  auth: oauth2Client
});

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
	const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

	const res = await calendar.events.list({
    calendarId: 'primary'
  });
	console.log('calendar res', res.body);
  /*const response = await axios.get(
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
  );*/

  return res.body._events;
}

async function handleGoogleLogin(req, res) {
  const code = req.query.code;

  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log('tokens', tokens);
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
	console.log('handleDataRequestFromGoogle')
  const access_token = req.session.token;
	console.log('access token:', access_token);
  //const userData = await getGoogleUserInfo(access_token);
  //console.log(userData);

  const calendarData = await getCalendarEvents(access_token);
  console.log('calendar data: ', calendarData);

  res.status(200).json({ calendar: calendarData });
}

module.exports = { handleGoogleLogin, handleDataRequestFromGoogle };
