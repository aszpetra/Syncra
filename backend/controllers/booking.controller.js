const { google } = require('googleapis');
require('dotenv').config();
const Teacher = require('../models/teacher.model')

const client_id = process.env.GOOGLE_CLIENT_ID; 
const client_secret = process.env.GOOGLE_CLIENT_SECRET;

async function getAuthenticatedClientFromDB(teacherId) {
    
    // 1. Keresd meg a tanárt és a refresh token-t a DB-ben
    const teacher = await Teacher.findById(teacherId).select('refreshToken'); 
    console.log('Teacher from DB:', teacher);

    // 2. Érvénytelen token/tanár ellenőrzés
    if (!teacher || !teacher.refreshToken) {
        throw new Error('Teacher not found or missing refresh token in database. Cannot authenticate Google client.');
    }
    
    // 3. Hozd létre az OAuth2 klienst
    const oauth2Client = new google.auth.OAuth2(
        client_id,
        client_secret
        // A redirect_uri itt nem feltétlenül kell, mert csak tokeneket frissítünk
    );
    
    // 4. Állítsd be a tokent a DB-ből származó refresh token-nel
    oauth2Client.setCredentials({
        refresh_token: teacher.refreshToken,
    });

    try {
        // 5. Frissítsd az access token-t (ezt teszi lehetővé a Google API hívást)
        // A Google library automatikusan használja a refresh tokent.
        const { credentials } = await oauth2Client.refreshAccessToken();

        // Opcionális: A frissített access tokent beállítjuk a kliensnek
        oauth2Client.setCredentials(credentials); 
        
        return oauth2Client; // A hitelesített kliens visszaküldése

    } catch (error) {
        // Gyakori hiba: A refresh token is lejárt (pl. 6 hónap után)
        console.error('Failed to refresh access token for teacher:', teacherId, error.message);
        throw new Error(error.message);
    }
}

async function getPublicAvailability(req, res) {
    // GET /public/availability/:teacherId
    const { teacherId } = req.params; 
    
    try {
        // 1. Előkészületek (Hitelesítés és foglalt slotok lekérése a Google-től)
        const authClient = await getAuthenticatedClientFromDB(teacherId); // Ezt már megírtad korábban
        
        // A foglalt időpontok lekérése 14 napra előre
        const SLOT_DURATION_MINUTES = 60; // 1 órás foglalási idő
        const SLOTS_IN_ADVANCE_DAYS = 14;
        const now = new Date();
        const twoWeeksFromNow = new Date(now.getTime() + SLOTS_IN_ADVANCE_DAYS * 24 * 60 * 60 * 1000);

        const response = await calendar.events.list({
            // ... (Google API hívás beállításai) ...
            timeMin: now.toISOString(),
            timeMax: twoWeeksFromNow.toISOString(),
            // ...
        });
        const busySlots = response.data.items.map(event => ({
            start: new Date(event.start.dateTime || event.start.date), // Date objectek használata egyszerűsíti az összehasonlítást
            end: new Date(event.end.dateTime || event.end.date)
        }));

        // 2. TODO: DB-ből recurring szabályok lekérése (Ezt majd be kell vezetned)
        // MOCK adat: (1=Hétfő, 5=Péntek)
        const availabilityRules = [
            { dayOfWeek: 1, start: '09:00', end: '17:00' }, // Monday 9:00-17:00
            { dayOfWeek: 2, start: '10:00', end: '18:00' }, // Tuesday 10:00-18:00
            // ... (bővítsd a többi nappal)
        ]; 

        // 3. GENERÁLÁS ÉS SZŰRÉS
        const availableSlots = [];
        const todayAtMidnight = new Date(now);
        todayAtMidnight.setHours(0, 0, 0, 0); 

        for (let i = 0; i < SLOTS_IN_ADVANCE_DAYS; i++) {
            const checkDate = new Date(todayAtMidnight);
            checkDate.setDate(todayAtMidnight.getDate() + i);
            const dayIndex = checkDate.getDay(); // 0 (Sun) to 6 (Sat)
            
            const dayRule = availabilityRules.find(rule => rule.dayOfWeek === dayIndex); 

            if (dayRule) {
                let currentTime = new Date(checkDate);
                
                // Beállítjuk a nap kezdetét a szabály alapján
                const [startHour, startMinute] = dayRule.start.split(':').map(Number);
                currentTime.setHours(startHour, startMinute, 0, 0);

                // Beállítjuk a nap végét
                const [endHour, endMinute] = dayRule.end.split(':').map(Number);
                const dayEndTime = new Date(checkDate);
                dayEndTime.setHours(endHour, endMinute, 0, 0);

                // Generálás: Amíg a következő slot vége még a munkaidőn belül van
                while (currentTime.getTime() + SLOT_DURATION_MINUTES * 60 * 1000 <= dayEndTime.getTime()) {
                    const slotStart = new Date(currentTime);
                    const slotEnd = new Date(slotStart.getTime() + SLOT_DURATION_MINUTES * 60 * 1000);

                    // Szűrés: Check for Overlap (slotStart < busyEnd AND slotEnd > busyStart)
                    const isBusy = busySlots.some(busy => 
                        slotStart.getTime() < busy.end.getTime() && slotEnd.getTime() > busy.start.getTime()
                    );

                    if (!isBusy) {
                        availableSlots.push({
                            start: slotStart.toISOString(), // ISO String a frontendnek
                            end: slotEnd.toISOString(),
                            // Dátum formázása a frontend csoportosításhoz
                            dateKey: slotStart.toISOString().split('T')[0] 
                        });
                    }

                    // Lépés a következő slotra
                    currentTime = slotEnd; 
                }
            }
        }
        
        res.status(200).json({ 
            availableSlots: availableSlots, // A szabad slotok listája
            message: 'Teacher availability slots calculated.'
        });

    } catch (error) {
        console.error('Error fetching public availability:', error.message);
        res.status(500).json({ message: error.message });
    }
}

async function handlePublicBooking(req, res) {
    // POST /public/book
    const { teacherId, bookingDetails } = req.body;

    // TODO: Validáció: Ellenőrizd a bemenő adatokat.
    // TODO: DB Mentés: Hozz létre egy Appointment bejegyzést.
    // TODO: Google API: Hozz létre egy eseményt a tanár naptárában.
    res.status(201).json({ message: 'Appointment booked successfully.' });
}

// --- 3. Elérhetőség Kezelése (Teacher Availability Management) ---

async function getRecurringAvailability(req, res) {
    // GET /api/availability/settings (Hitelesítés szükséges)
    // TODO: Ellenőrizd a req.session.user meglétét.
    // TODO: DB Lekérés: Olvasd ki a tanár beállított recurring szabályait (pl. H-P 9-17).
    res.status(200).json({ rules: [] });
}

async function setRecurringAvailability(req, res) {
    // POST /api/availability/settings (Hitelesítés szükséges)
    const { rules } = req.body;

    // TODO: DB Mentés: Frissítsd vagy hozz létre Availability bejegyzést a tanárhoz.
    res.status(200).json({ message: 'Availability rules saved.' });
}

async function blockSpecificTime(req, res) {
    // POST /api/availability/block (Hitelesítés szükséges)
    const { startTime, endTime, reason } = req.body;

    // TODO: DB Mentés: Hozz létre egy 'blocked' bejegyzést a saját DB-ben vagy a Google naptárban.
    res.status(201).json({ message: 'Time blocked successfully.' });
}

// --- 4. Naptár Integráció (Calendar Integration) ---

async function listGoogleCalendars(req, res) {
    // GET /api/calendars/list (Hitelesítés szükséges)
    // TODO: Használd az getAuthenticatedClient helper-t a session tokenekkel.
    // TODO: Google API: Hívd a 'calendarList.list' végpontot.
    res.status(200).json({ calendars: [{ id: 'primary', summary: 'Primary Calendar' }] });
}

async function selectCalendarsForSync(req, res) {
    // POST /api/calendars/select (Hitelesítés szükséges)
    const { selectedCalendarIds } = req.body;

    // TODO: DB Mentés: Mentsd el a kiválasztott naptár ID-kat a Teacher modellhez.
    res.status(200).json({ message: 'Selected calendars saved for synchronization.' });
}

module.exports = {
    getPublicAvailability,
    handlePublicBooking,
    getRecurringAvailability,
    setRecurringAvailability,
    blockSpecificTime,
    listGoogleCalendars,
    selectCalendarsForSync,
};