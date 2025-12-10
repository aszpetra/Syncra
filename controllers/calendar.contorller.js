const { google } = require("googleapis");
const Teacher = require('../models/teacher.model');

async function getCalendarEvents(authClient, teacherId) {
  const calendar = google.calendar({ version: 'v3', auth: authClient });
  const oneWeekInMilisec = 7 * 24 * 60 * 60 * 1000;

  const teacher = await Teacher.findById(teacherId).select('blockingCalendarIds');
  const calendarIds = teacher ? teacher.blockingCalendarIds : [];
  const calendarsToQuery = (calendarIds && calendarIds.length > 0) ? calendarIds : ['primary'];

  const promises = calendarsToQuery.map(async (calId) => {
    try {
      const res = await calendar.events.list({
        calendarId: calId,
        timeMin: (new Date(Date.now() - oneWeekInMilisec)).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      });
      
      return res.data.items.map(event => ({
        ...event
      }));
    } catch (error) {
      console.error(`Hiba a(z) ${calId} naptár lekérdezésekor:`, error.message);
      return [];
    }
  });

  const results = await Promise.all(promises);
  const allEvents = results.flat();
  allEvents.sort((a, b) => {
    const startA = new Date(a.start.dateTime || a.start.date).getTime();
    const startB = new Date(b.start.dateTime || b.start.date).getTime();
    return startA - startB;
  });

  return allEvents;
}

module.exports = { getCalendarEvents };