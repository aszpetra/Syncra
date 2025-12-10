const { google } = require('googleapis');
require('dotenv').config();
const { getGoogleUserInfo } = require('./auth.controller');
const crypto = require('crypto');
const { getGoogleClientAndRefreshToken } = require('../services/auth.service');
const { getOrCreateBookingSheetId, autoResizeSheetColumns, appendRowToSheet, addEventToCalendar, getSheetId } = require('../services/google.service');
const { updateUserCalendars, getUserCalendars } = require('../services/db.service');

async function createBooking(req, res) {
    const { teacherId, clientName, clientEmail, notes, slotStart, slotEnd } = req.body;
    const BOOKING_KEYWORD = 'SYNCRA_BOOKING'; 
    
    try {
        const authClient = await getGoogleClientAndRefreshToken(teacherId);
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        const SPREADSHEET_ID = await getOrCreateBookingSheetId(authClient);
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const teacherInfo = await getGoogleUserInfo(authClient); 

        const event = {
            summary: `Booking: ${clientName}`,
            description: `${notes}\n\n[${BOOKING_KEYWORD}]`, 
            start: {
                dateTime: slotStart
            },
            end: {
                dateTime: slotEnd
            },
            attendees: [
                { email: clientEmail, displayName: clientName, responseStatus: 'needsAction' },
                { email: teacherInfo.email, self: true, responseStatus: 'needsAction'}
            ],
            sendUpdates: 'all', 
            reminders: {
                useDefault: false,
                overrides: [
                    { method: 'email', minutes: 60 },
                    { method: 'email', minutes: 5 },
                    { method: 'popup', minutes: 10 },
                ],
            },
            conferenceData: {
                createRequest: {
                    requestId: crypto.randomUUID(),
                    conferenceSolutionKey: { type: "hangoutsMeet" },
                },
            },
        };

        const calendarResponse = await addEventToCalendar(calendar, event);

        const eventId = calendarResponse.data.id;

    try {
        await appendRowToSheet(
            authClient, 
            SPREADSHEET_ID,
            eventId,
            clientName, 
            clientEmail, 
            slotStart, 
            slotEnd
        );

        const sheetId = await getSheetId(sheets, SPREADSHEET_ID);
        
        await autoResizeSheetColumns(authClient, SPREADSHEET_ID, sheetId);
    } catch (sheetError) {
        console.error('Hiba a Google Sheets mentéskor:', sheetError);
    }

        res.status(200).json({ 
            message: 'Foglalás sikeresen létrehozva.',
            eventUrl: calendarResponse.data.htmlLink
        });

    } catch (error) {
        console.error('CRITICAL ERROR during booking creation:', error);
        res.status(500).json({ message: 'Error creating booking.' });
    }
}

async function listGoogleCalendars(req, res) {
    try {
        const teacherId = req.session.user._id;
        const authClient = await getGoogleClientAndRefreshToken(teacherId);
        
        const calendar = google.calendar({ version: 'v3', auth: authClient });

        const response = await calendar.calendarList.list({
            minAccessRole: 'reader'
        });

        const calendars = response.data.items.map(cal => ({
            id: cal.id,
            summary: cal.summary,
            primary: cal.primary || false,
            backgroundColor: cal.backgroundColor
        }));
        console.log({ calendars });
        res.status(200).json({ calendars });
        

    } catch (error) {
        console.error('Hiba a naptárak listázásakor:', error.message);
        if (error.message.includes('Nincs session token')) {
            return res.status(401).json({ message: 'Nincs bejelentkezve.' });
        }
        res.status(500).json({ message: 'Nem sikerült lekérni a naptárakat.' });
    }
}

async function selectCalendarsForSync(req, res) {
    const { selectedCalendarIds, bookingId } = req.body;

    if (!Array.isArray(selectedCalendarIds)) {
        return res.status(400).json({ message: 'Hibás adatformátum. Tömböt várunk.' });
    }

    const teacherId = req.session.user._id;

    try {
        await updateUserCalendars(teacherId, selectedCalendarIds, bookingId);

        res.status(200).json({ message: 'A szinkronizációs beállítások sikeresen mentve.' });
    } catch (error) {
        console.error('Hiba a naptár beállítások mentésekor:', error);
        res.status(500).json({ message: 'Szerver hiba a mentés során.' });
    }
}

async function getBlockingCalendars(req, res) {
    try {
        const teacherId = req.session.user._id;

        const teacher = await getUserCalendars(teacherId);

        if (!teacher) {
            return res.status(404).json({ message: 'Tanár nem található.' });
        }

        console.log('Blocking calendars retrieved:', teacher.blockingCalendarIds, teacher.bookingCalendarId);

        res.status(200).json({
            blockingCalendarIds: teacher.blockingCalendarIds || [],
            bookingCalendarId: teacher.bookingCalendarId || ''
        });

    } catch (error) {
        console.error('Hiba a blokkoló naptárak lekérésekor:', error);
        res.status(500).json({ message: 'Szerverhiba az adatok lekérésekor.' });
    }
}

module.exports = {
    createBooking,
    listGoogleCalendars,
    selectCalendarsForSync,
    getBlockingCalendars
};