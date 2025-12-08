const Availability = require('../models/availability.model');
const { listUserCalendars } = require('../services/calendar.service');
const { getAuthenticatedClientFromDB } = require('./booking.controller');

async function saveTeacherAvailability(req, res) {
    try {
        const { teacherId, weeklyAvailability } = req.body; 

        if (!teacherId || !weeklyAvailability) {
            return res.status(400).json({ message: 'Hiányzó adatok.' });
        }

        const availability = await Availability.findOneAndUpdate(
            { teacher: teacherId },
            { weeklyAvailability: weeklyAvailability },
            { new: true, upsert: true }
        );

        res.status(200).json({ 
            message: 'Rendelkezésre állás sikeresen mentve.', 
            availability: availability 
        });

    } catch (error) {
        console.error('Hiba a rendelkezésre állás mentésekor:', error);
        res.status(500).json({ message: 'Szerverhiba a mentés során.' });
    }
}

async function getTeacherAvailability(req, res) {
    try {
        const teacherId = req.params.teacherId; 

        const availability = await Availability.findOne({ teacher: teacherId });

        if (!availability) {
            return res.status(200).json({ weeklyAvailability: [] }); 
        }

        res.status(200).json(availability);

    } catch (error) {
        console.error('Hiba a rendelkezésre állás lekérésekor:', error);
        res.status(500).json({ message: 'Szerverhiba a lekérés során.' });
    }
}

module.exports = {
    saveTeacherAvailability,
    getTeacherAvailability,
    getCalendarList
};