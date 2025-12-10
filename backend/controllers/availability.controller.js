const { google } = require('googleapis');
const { getUserById, updateAvailability, getAvailability } = require('../services/db.service');
const { getGoogleClientAndRefreshToken } = require('../services/auth.service');
const { getAllCalendarEvents } = require('../services/google.service');

async function saveTeacherAvailability(req, res) {
    try {
        const { teacherId, weeklyAvailability } = req.body; 

        if (!teacherId || !weeklyAvailability) {
            return res.status(400).json({ message: 'Missing data' });
        }

        const availability = await updateAvailability(teacherId, weeklyAvailability);

        res.status(200).json({ 
            message: 'Availability saved successfully', 
            availability: availability 
        });

    } catch (error) {
        console.error('Error while saving availability:', error);
        res.status(500).json({ message: 'Server error while saving availability.' });
    }
}

async function getTeacherAvailability(req, res) {
    try {
        const teacherId = req.params.teacherId; 

        const availability = await getAvailability(teacherId);

        if (!availability) {
            return res.status(200).json({ weeklyAvailability: [] }); 
        }

        res.status(200).json(availability);

    } catch (error) {
        console.error('Error while fetching availability:', error);
        res.status(500).json({ message: 'Server error while fetching availability.' });
    }
}

async function getPublicAvailability(req, res) {
    const { teacherId } = req.params; 
    
    try {
        const authClient = await getGoogleClientAndRefreshToken(teacherId);
        const teacher = await getUserById(teacherId);
        const SLOT_DURATION_MINUTES = 60;
        const SLOTS_IN_ADVANCE_DAYS = 14;
        const now = new Date();
        const twoWeeksFromNow = new Date(now.getTime() + SLOTS_IN_ADVANCE_DAYS * 24 * 60 * 60 * 1000);
        const calendar = google.calendar({ version: 'v3', auth: authClient });
        let calendarIdsToCheck = teacher.blockingCalendarIds;
        const freeBusyResponse = await getAllCalendarEvents(calendar, calendarIdsToCheck, twoWeeksFromNow);

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
        
        const availabilityDoc = await getAvailability(teacherId);
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

module.exports = {
    saveTeacherAvailability,
    getTeacherAvailability,
    getPublicAvailability
};