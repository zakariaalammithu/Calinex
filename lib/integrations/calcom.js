const { db } = require('../db');
const { logActivity } = require('../auth');
const { sendEmail } = require('./resend');
const { createCalendarEvent, cancelCalendarEvent } = require('./calendar');
const { syncLeadToSheets } = require('./sheets');

/**
 * Cal.com Booking Webhook Processor
 */

function getCalcomConfig() {
  const row = db.prepare("SELECT * FROM integrations WHERE provider = 'cal_com'").get();
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
 * Process Incoming Cal.com Webhook Payload
 */
async function processCalcomWebhook(payload = {}) {
  try {
    const triggerEvent = payload.triggerEvent || 'BOOKING_CREATED';
    const payloadData = payload.payload || payload;

    const clientName = payloadData.name || (payloadData.attendees && payloadData.attendees[0] ? payloadData.attendees[0].name : 'Client');
    const clientEmail = payloadData.email || (payloadData.attendees && payloadData.attendees[0] ? payloadData.attendees[0].email : '');
    const meetingType = payloadData.title || payloadData.eventTitle || '30 Min Discovery Call';
    const startTime = payloadData.startTime ? new Date(payloadData.startTime) : new Date();
    const bookingDate = startTime.toISOString().split('T')[0];
    const timeSlot = startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const calBookingId = String(payloadData.bookingId || payloadData.id || `cal_${Date.now()}`);
    const notes = payloadData.description || payloadData.additionalNotes || 'Cal.com booked meeting';

    let clientPhone = payloadData.phone || payloadData.phoneNumber || (payloadData.attendees && payloadData.attendees[0] ? (payloadData.attendees[0].phone || payloadData.attendees[0].phoneNumber) : '') || '';
    if (!clientPhone && payloadData.responses) {
      clientPhone = payloadData.responses.phone || payloadData.responses.phoneNumber || payloadData.responses.smsReminderNumber || payloadData.responses.Phone || '';
    }
    if (!clientPhone && clientEmail) {
      const matchContact = db.prepare('SELECT phone FROM contacts WHERE email = ? LIMIT 1').get(clientEmail);
      if (matchContact && matchContact.phone) clientPhone = matchContact.phone;
      else {
        const matchMsg = db.prepare('SELECT phone FROM messages WHERE email = ? AND phone IS NOT NULL AND phone != "" LIMIT 1').get(clientEmail);
        if (matchMsg && matchMsg.phone) clientPhone = matchMsg.phone;
      }
    }

    if (!clientEmail) {
      throw new Error('Attendee email missing from Cal.com webhook payload');
    }

    // 1. Insert or Update `bookings` Table
    const existing = db.prepare('SELECT id FROM bookings WHERE cal_booking_id = ?').get(calBookingId);
    let bookingId = null;

    if (existing) {
      bookingId = existing.id;
      const status = triggerEvent === 'BOOKING_CANCELLED' ? 'cancelled' : 'rescheduled';
      db.prepare(`
        UPDATE bookings SET
          client_phone = COALESCE(?, client_phone),
          booking_date = ?,
          time_slot = ?,
          status = ?,
          notes = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(clientPhone || null, bookingDate, timeSlot, status, notes, bookingId);
    } else {
      const resDb = db.prepare(`
        INSERT INTO bookings (
          client_name, client_email, client_phone, meeting_type, booking_date, time_slot,
          duration_minutes, source, status, notes, cal_booking_id
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          30, 'Cal.com', 'confirmed', ?, ?
        )
      `).run(clientName, clientEmail, clientPhone || null, meetingType, bookingDate, timeSlot, notes, calBookingId);
      bookingId = resDb.lastInsertRowid;
    }

    const bookingRecord = { id: bookingId, client_name: clientName, client_email: clientEmail, meeting_type: meetingType, booking_date: bookingDate, time_slot: timeSlot, notes };

    // 2. Trigger Google Calendar Event Sync
    if (triggerEvent !== 'BOOKING_CANCELLED') {
      await createCalendarEvent(bookingRecord);
    } else {
      await cancelCalendarEvent(bookingId);
    }

    // 3. Trigger Resend Confirmation Email to Client and Admin
    if (triggerEvent === 'BOOKING_CREATED') {
      await sendEmail({
        to: clientEmail,
        slug: 'booking_confirmation',
        variables: {
          name: clientName,
          meeting_type: meetingType,
          booking_date: bookingDate,
          time_slot: timeSlot
        }
      }).catch(e => console.error('[CLIENT MEETING CONFIRMATION ERROR]', e));

      // Admin Email Alert to admin@calinex.us & admin@calinex.us
      await sendEmail({
        to: ['admin@calinex.us', 'admin@calinex.us'],
        slug: 'booking_confirmation',
        variables: {
          name: clientName,
          client_email: clientEmail,
          meeting_type: meetingType,
          booking_date: bookingDate,
          time_slot: timeSlot,
          notes: notes
        }
      }).catch(e => console.error('[ADMIN MEETING ALERT ERROR]', e));
    }

    // 4. Trigger Google Sheets Sync
    await syncLeadToSheets(bookingId, {
      name: clientName,
      email: clientEmail,
      service: `Meeting: ${meetingType}`,
      source: 'Cal.com',
      message: `Scheduled meeting on ${bookingDate} at ${timeSlot}`,
      created_at: new Date().toISOString()
    });

    // 5. Update Integration Status
    db.prepare(`
      UPDATE integrations SET
        status = 'connected',
        last_success_at = CURRENT_TIMESTAMP,
        last_error_message = NULL
      WHERE provider = 'cal_com'
    `).run();

    // 6. Admin Notification
    db.prepare(`
      INSERT INTO notifications (title, message, type, link)
      VALUES (?, ?, 'success', '#leads-bookings')
    `).run(
      `Cal.com Booking: ${clientName}`,
      `${clientName} scheduled "${meetingType}" on ${bookingDate} at ${timeSlot}.`
    );

    logActivity(null, `Cal.com Webhook Processed (${triggerEvent})`, 'CalCom', bookingId.toString(), '127.0.0.1', 'CalComWebhook', `Client: ${clientName}`);

    return { success: true, bookingId };

  } catch (err) {
    const errMsg = err.message || 'Error processing Cal.com webhook';
    db.prepare(`
      UPDATE integrations SET
        status = 'error',
        last_error_at = CURRENT_TIMESTAMP,
        last_error_message = ?
      WHERE provider = 'cal_com'
    `).run(errMsg);

    console.error('[CAL.COM WEBHOOK ERROR]', err);
    return { success: false, error: errMsg };
  }
}

module.exports = {
  getCalcomConfig,
  processCalcomWebhook
};
