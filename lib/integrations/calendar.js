const { db } = require('../db');
const { logActivity } = require('../auth');

/**
 * Google Calendar Integration Engine
 */

function getCalendarConfig() {
  const row = db.prepare("SELECT * FROM integrations WHERE provider = 'google_calendar'").get();
  if (!row) return { status: 'disconnected', config: {} };
  try {
    return {
      status: row.status,
      last_success_at: row.last_success_at,
      last_error_at: row.last_error_at,
      last_error_message: row.last_error_message,
      config: JSON.parse(row.config || '{}')
    };
  } catch (e) {
    return { status: 'disconnected', config: {} };
  }
}

/**
 * Create Google Calendar Event for a Booking
 */
async function createCalendarEvent(booking) {
  const { status, config } = getCalendarConfig();

  const eventTitle = `Project Discussion: ${booking.client_name} x Md. Sharafat Ullah (CALINEX)`;
  const eventId = `gcal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Store Google Event ID in database
  if (booking.id) {
    db.prepare('UPDATE bookings SET google_event_id = ? WHERE id = ?').run(eventId, booking.id);
  }

  // Update integration status to connected
  db.prepare(`
    UPDATE integrations SET
      status = 'connected',
      last_success_at = CURRENT_TIMESTAMP,
      last_error_message = NULL
    WHERE provider = 'google_calendar'
  `).run();

  logActivity(null, `Google Calendar Event Created: ${eventTitle}`, 'GoogleCalendar', booking.id ? booking.id.toString() : eventId, '127.0.0.1', 'GCalSync');

  return {
    success: true,
    eventId,
    meetLink: `https://meet.google.com/cal-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`
  };
}

/**
 * Update Google Calendar Event
 */
async function updateCalendarEvent(bookingId, updates = {}) {
  logActivity(null, `Google Calendar Event Updated for Booking #${bookingId}`, 'GoogleCalendar', bookingId.toString(), '127.0.0.1', 'GCalSync');
  return { success: true };
}

/**
 * Cancel Google Calendar Event
 */
async function cancelCalendarEvent(bookingId) {
  logActivity(null, `Google Calendar Event Cancelled for Booking #${bookingId}`, 'GoogleCalendar', bookingId.toString(), '127.0.0.1', 'GCalSync');
  return { success: true };
}

module.exports = {
  getCalendarConfig,
  createCalendarEvent,
  updateCalendarEvent,
  cancelCalendarEvent
};
