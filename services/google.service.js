const { google } = require('googleapis');

async function getAllCalendarEvents(calendar, calendarIdsToCheck, twoWeeksFromNow) {
  const now = new Date();
  return calendar.freebusy.query({
            requestBody: {
                timeMin: now.toISOString(),
                timeMax: twoWeeksFromNow.toISOString(),
                orderBy: 'startTime',
                items: calendarIdsToCheck.map(id => ({ id: id })) 
            },
        });
}

async function addEventToCalendar(calendar, event, calendarId) {
    return calendar.events.insert({
                calendarId: calendarId,
                resource: event,
                sendUpdates: 'all',
                sendNotifications: true,
                conferenceDataVersion: 1
            });
}

async function getSheetId(sheets, SPREADSHEET_ID) {
    const meta = await sheets.spreadsheets.get({
        spreadsheetId: SPREADSHEET_ID,
        fields: 'sheets.properties',
    });
    return meta.data.sheets[0].properties.sheetId;
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

module.exports = { getAllCalendarEvents, getOrCreateBookingSheetId, autoResizeSheetColumns, appendRowToSheet, addEventToCalendar, getSheetId}