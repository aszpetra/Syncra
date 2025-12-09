const { google } = require('googleapis');
require('dotenv').config();
const Teacher = require('../models/teacher.model')
const { getGoogleUserInfo } = require('./auth.controller');
const Availability = require('../models/availability.model');

const client_id = process.env.GOOGLE_CLIENT_ID; 
const client_secret = process.env.GOOGLE_CLIENT_SECRET;

async function getAuthenticatedClientFromDB(teacherId) {
    const teacher = await Teacher.findById(teacherId).select('refreshToken'); 

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

async function getPublicAvailability(req, res) {
    const { teacherId } = req.params; 
    
    try {
        const authClient = await getAuthenticatedClientFromDB(teacherId);
        const teacher = await Teacher.findById(teacherId);

        const SLOT_DURATION_MINUTES = 60;
        const SLOTS_IN_ADVANCE_DAYS = 14;
        const now = new Date();
        const twoWeeksFromNow = new Date(now.getTime() + SLOTS_IN_ADVANCE_DAYS * 24 * 60 * 60 * 1000);

        const calendar = google.calendar({ version: 'v3', auth: authClient });

        let calendarIdsToCheck = teacher.blockingCalendarIds;

        const freeBusyResponse = await calendar.freebusy.query({
            requestBody: {
                timeMin: now.toISOString(),
                timeMax: twoWeeksFromNow.toISOString(),
                orderBy: 'startTime',
                items: calendarIdsToCheck.map(id => ({ id: id })) 
            },
        });

        let allBusySlots = [];
        const calendarsData = freeBusyResponse.data.calendars;

        for (const calId in calendarsData) {
            const calendarData = calendarsData[calId];
            if (calendarData.busy && calendarData.busy.length > 0) {
                allBusySlots = allBusySlots.concat(calendarData.busy);
            }
        }

        const busySlots = allBusySlots.map(slot => ({
            start: new Date(slot.start),
            end: new Date(slot.end)
        }));
        
        const availabilityDoc = await Availability.findOne({ teacher: teacherId });
        const availabilityRules = availabilityDoc ? availabilityDoc.weeklyAvailability : [];

        if (availabilityRules.length === 0) {
             return res.status(200).json({ 
                availableSlots: [], 
                message: 'No availability rules set for this teacher.' 
            });
        }

        const availableSlots = [];
        const todayAtMidnight = new Date(now);
        todayAtMidnight.setHours(0, 0, 0, 0); 

        for (let i = 0; i < SLOTS_IN_ADVANCE_DAYS; i++) {
            const checkDate = new Date(todayAtMidnight);
            checkDate.setDate(todayAtMidnight.getDate() + i);
            const dayIndex = checkDate.getDay(); 
            
            const dayRule = availabilityRules.find(rule => rule.dayOfWeek === dayIndex); 

            if (dayRule) {
               dayRule.slots.forEach(ruleSlot => {
                    
                    let currentTime = new Date(checkDate);
                    const [startHour, startMinute] = ruleSlot.startTime.split(':').map(Number);
                    currentTime.setHours(startHour, startMinute, 0, 0);

                    const [endHour, endMinute] = ruleSlot.endTime.split(':').map(Number);
                    const ruleEndTime = new Date(checkDate);
                    ruleEndTime.setHours(endHour, endMinute, 0, 0);
                    while (currentTime.getTime() + SLOT_DURATION_MINUTES * 60 * 1000 <= ruleEndTime.getTime()) {
                        
                        const slotStart = new Date(currentTime);
                        const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

                        const isBusy = busySlots.some(busy => 
                            slotStart.getTime() < busy.end.getTime() && slotEnd.getTime() > busy.start.getTime()
                        );

                        if (!isBusy) {
                            availableSlots.push({
                                start: slotStart.toISOString(),
                                end: slotEnd.toISOString(),
                                dateKey: slotStart.toISOString().split('T')[0] 
                            });
                        }

                        currentTime = slotEnd; 
                    }
                });
            }
        }
        
        res.status(200).json({ 
            availableSlots: availableSlots,
            message: 'Teacher availability slots calculated.'
        });

    } catch (error) {
        console.error('Error fetching public availability:', error.message);
        res.status(500).json({ message: error.message });
    }
}

async function getOrCreateBookingSheetId(authClient) {
    const drive = google.drive({ version: 'v3', auth: authClient });
    const sheets = google.sheets({ version: 'v4', auth: authClient });

    const FOLDER_NAME = 'syncra';
    const SHEET_NAME = 'booking'; 

    let folderId = null;
    let spreadsheetId = null;

    let folderRes = await drive.files.list({
        q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive',
    });

    if (folderRes.data.files.length > 0) {
        folderId = folderRes.data.files[0].id;
    } else {
        const folderMetadata = {
            'name': FOLDER_NAME,
            'mimeType': 'application/vnd.google-apps.folder',
        };
        const folder = await drive.files.create({
            resource: folderMetadata,
            fields: 'id',
        });
        folderId = folder.data.id;
        console.log(`'${FOLDER_NAME}' mappa létrehozva (ID: ${folderId})`);
    }

    let sheetRes = await drive.files.list({
        q: `name='${SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and '${folderId}' in parents and trashed=false`,
        fields: 'files(id)',
        spaces: 'drive',
    });

    if (sheetRes.data.files.length > 0) {
        spreadsheetId = sheetRes.data.files[0].id;
    } else {
        const sheetMetadata = {
            'name': SHEET_NAME,
            'parents': [folderId],
            'mimeType': 'application/vnd.google-apps.spreadsheet',
        };
        const sheet = await drive.files.create({
            resource: sheetMetadata,
            fields: 'id',
        });
        spreadsheetId = sheet.data.id;
        console.log(`'${SHEET_NAME}' Google Sheet created (ID: ${spreadsheetId})`);

        const headers = [['Name', 'Email', 'Date and Time', 'Event ID']];
        await sheets.spreadsheets.values.update({
            spreadsheetId: spreadsheetId,
            range: `A1`,
            valueInputOption: 'USER_ENTERED',
            resource: { values: headers },
        });

        const sheetMeta = await sheets.spreadsheets.get({
            spreadsheetId: spreadsheetId,
            fields: 'sheets.properties',
        });

        const defaultSheetId = sheetMeta.data.sheets[0].properties.sheetId;

        const requests = [
            {
                setBasicFilter: {
                    filter: {
                        range: {
                            sheetId: defaultSheetId,
                            startRowIndex: 0,
                            endRowIndex: 1,
                        }
                    }
                }
            }
        ];

        await sheets.spreadsheets.batchUpdate({
            spreadsheetId: spreadsheetId,
            resource: { requests },
        });
    }

    return spreadsheetId; 
}

async function autoResizeSheetColumns(auth, spreadsheetId, sheetId) {
    const sheets = google.sheets({ version: 'v4', auth });
    
    const request = {
        autoResizeDimensions: {
            dimensions: {
                sheetId: sheetId,
                dimension: 'COLUMNS', 
                startIndex: 0,
                endIndex: 4
            }
        }
    };
    
    await sheets.spreadsheets.batchUpdate({
        spreadsheetId: spreadsheetId,
        resource: { requests: [request] },
    });
}

async function createBooking(req, res) {
    const { teacherId, clientName, clientEmail, notes, slotStart, slotEnd } = req.body;
    const BOOKING_KEYWORD = 'SYNCRA_BOOKING'; 
    
    try {
        const authClient = await getAuthenticatedClientFromDB(teacherId);
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        const SPREADSHEET_ID = await getOrCreateBookingSheetId(authClient);
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const teacherInfo = await getGoogleUserInfo(authClient); 

        const event = {
            summary: `Booking: ${clientName}`,
            description: `${notes}\n\n[${BOOKING_KEYWORD}]`, 
            start: {
                dateTime: slotStart,
                timeZone: 'Europe/Budapest',
            },
            end: {
                dateTime: slotEnd,
                timeZone: 'Europe/Budapest',
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
            conferenceData: {},
        };

        const calendarResponse = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
            sendUpdates: 'all',
            sendNotifications: true,
            conferenceDataVersion: 1
        });

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

        const sheetMeta = await sheets.spreadsheets.get({
                spreadsheetId: SPREADSHEET_ID,
                fields: 'sheets.properties',
            });
        const sheetId = sheetMeta.data.sheets[0].properties.sheetId;
        
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

async function appendRowToSheet(auth, spreadsheetId, eventId, clientName, clientEmail, slotStart, slotEnd) {
    const sheets = google.sheets({ version: 'v4', auth });

    const formattedDateTime = `${new Date(slotStart).toLocaleString('hu-HU')} - ${new Date(slotEnd).toLocaleTimeString('hu-HU')}`;

    const dataRow = [
        clientName, 
        clientEmail, 
        formattedDateTime,
        eventId 
    ];

    const resource = {
        values: [dataRow],
    };
    
    await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId,
        range: `A1`,
        valueInputOption: 'USER_ENTERED',
        resource,
    });
}

async function listGoogleCalendars(req, res) {
    try {
        const teacherId = req.session.user._id;
        const authClient = await getAuthenticatedClientFromDB(teacherId);
        
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

    const teacherId = req.session?.user?._id;

    if (!teacherId) {
        return res.status(401).json({ message: 'Nincs bejelentkezve.' });
    }

    try {
        await Teacher.findByIdAndUpdate(teacherId, {
            blockingCalendarIds: selectedCalendarIds,
            bookingCalendarId: bookingId
        });

        res.status(200).json({ message: 'A szinkronizációs beállítások sikeresen mentve.' });
    } catch (error) {
        console.error('Hiba a naptár beállítások mentésekor:', error);
        res.status(500).json({ message: 'Szerver hiba a mentés során.' });
    }
}

async function getBlockingCalendars(req, res) {
    try {
        const teacherId = req.session.user._id;

        const teacher = await Teacher.findById(teacherId).select('blockingCalendarIds bookingCalendarId');

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
    getAuthenticatedClientFromDB,
    getPublicAvailability,
    createBooking,
    listGoogleCalendars,
    selectCalendarsForSync,
    getBlockingCalendars
};