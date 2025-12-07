import nodemailer from 'nodemailer';

/**
 * Smart Email System
 * - Meeting invites: Sent FROM inviter TO invitee (person-to-person)
 * - Self reminders: Sent FROM user TO user (self-reminder)
 * 
 * This avoids needing a company email - uses authenticated user credentials
 */

interface EmailCredentials {
    email: string;
    appPassword: string;
}

// Create a transporter for a specific user's credentials
function createTransporter(credentials: EmailCredentials) {
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: credentials.email,
            pass: credentials.appPassword,
        },
    });
}

// Fallback transporter using env vars (for testing or when user hasn't connected Gmail)
function getFallbackTransporter() {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
        return null;
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    });
}

interface MeetingInviteData {
    // Sender (the person requesting the meeting)
    senderEmail: string;
    senderName: string;
    senderCredentials?: EmailCredentials;

    // Recipient (the person being invited)
    recipientEmail: string;
    recipientName: string;

    // Meeting details
    meetingTitle: string;
    date: string;
    time: string;
    duration: number;
    locationType?: string;
    description?: string;
}

interface SelfReminderData {
    // User sends to themselves
    userEmail: string;
    userName: string;
    userCredentials?: EmailCredentials;

    // Meeting details
    meetingTitle: string;
    date: string;
    time: string;
    reminderType: 'upcoming' | 'starting_soon' | 'confirmation';
}

/**
 * SCENARIO 1: Meeting Request Between Two People
 * Email FROM: Person A (inviter) → TO: Person B (invitee)
 */
export async function sendMeetingInvite(data: MeetingInviteData) {
    const {
        senderEmail, senderName, senderCredentials,
        recipientEmail, recipientName,
        meetingTitle, date, time, duration, locationType, description
    } = data;

    const locationText = locationType === 'VIDEO' ? '📹 Video Call' :
        locationType === 'PHONE' ? '📞 Phone Call' :
            locationType === 'IN_PERSON' ? '📍 In Person' : 'To be determined';

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { color: #4A90E2; margin: 0; font-size: 24px; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; }
        .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; font-size: 14px; }
        .value { font-weight: 600; color: #333; font-size: 16px; }
        .btn { display: inline-block; background: #4A90E2; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; margin: 8px 4px; }
        .btn-secondary { background: #e5e7eb; color: #333; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">📅</div>
          <h1>Meeting Invitation</h1>
        </div>
        
        <p>Hi ${recipientName},</p>
        <p><strong>${senderName}</strong> would like to schedule a meeting with you.</p>
        
        <div class="details">
          <div class="detail-row">
            <div class="label">📅 Meeting</div>
            <div class="value">${meetingTitle}</div>
          </div>
          <div class="detail-row">
            <div class="label">🗓️ Date</div>
            <div class="value">${date}</div>
          </div>
          <div class="detail-row">
            <div class="label">🕐 Time</div>
            <div class="value">${time}</div>
          </div>
          <div class="detail-row">
            <div class="label">⏱️ Duration</div>
            <div class="value">${duration} minutes</div>
          </div>
          <div class="detail-row">
            <div class="label">📍 Location</div>
            <div class="value">${locationText}</div>
          </div>
          ${description ? `
          <div class="detail-row">
            <div class="label">📝 Notes</div>
            <div class="value">${description}</div>
          </div>
          ` : ''}
        </div>
        
        <p>Looking forward to connecting!</p>
        
        <div class="footer">
          <p>Reply to this email to contact ${senderName} directly.</p>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        // Use sender's credentials if available, otherwise fallback
        const transporter = senderCredentials
            ? createTransporter(senderCredentials)
            : getFallbackTransporter();

        if (!transporter) {
            console.log('No email credentials available, skipping email');
            return { success: false, error: 'No email credentials configured' };
        }

        const fromEmail = senderCredentials?.email || process.env.GMAIL_USER;

        const result = await transporter.sendMail({
            from: `"${senderName}" <${fromEmail}>`,
            to: recipientEmail,
            replyTo: senderEmail, // Replies go back to the actual sender
            subject: `📅 Meeting Invitation: ${meetingTitle}`,
            html,
        });

        console.log('Meeting invite sent:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending meeting invite:', error);
        return { success: false, error };
    }
}

/**
 * SCENARIO 2: Self Notification/Reminder
 * Email FROM: User → TO: User (appears as self-reminder)
 */
export async function sendSelfReminder(data: SelfReminderData) {
    const { userEmail, userName, userCredentials, meetingTitle, date, time, reminderType } = data;

    const subjects: Record<string, string> = {
        upcoming: `📅 Upcoming: ${meetingTitle}`,
        starting_soon: `⏰ Starting Soon: ${meetingTitle}`,
        confirmation: `✅ Confirmed: ${meetingTitle}`,
    };

    const messages: Record<string, string> = {
        upcoming: 'You have an upcoming meeting scheduled.',
        starting_soon: 'Your meeting is starting soon! Get ready.',
        confirmation: 'Your meeting has been confirmed.',
    };

    const icons: Record<string, string> = {
        upcoming: '📅',
        starting_soon: '⏰',
        confirmation: '✅',
    };

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { color: #4A90E2; margin: 0; font-size: 24px; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        .details { background: #f9fafb; border-radius: 8px; padding: 20px; margin: 24px 0; }
        .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
        .detail-row:last-child { border-bottom: none; }
        .label { color: #6b7280; font-size: 14px; }
        .value { font-weight: 600; color: #333; font-size: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">${icons[reminderType]}</div>
          <h1>${subjects[reminderType]}</h1>
        </div>
        
        <p>Hi ${userName},</p>
        <p>${messages[reminderType]}</p>
        
        <div class="details">
          <div class="detail-row">
            <div class="label">📅 Meeting</div>
            <div class="value">${meetingTitle}</div>
          </div>
          <div class="detail-row">
            <div class="label">🗓️ Date</div>
            <div class="value">${date}</div>
          </div>
          <div class="detail-row">
            <div class="label">🕐 Time</div>
            <div class="value">${time}</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

    try {
        // Use user's own credentials to send to themselves
        const transporter = userCredentials
            ? createTransporter(userCredentials)
            : getFallbackTransporter();

        if (!transporter) {
            console.log('No email credentials available, skipping reminder');
            return { success: false, error: 'No email credentials configured' };
        }

        const fromEmail = userCredentials?.email || process.env.GMAIL_USER;

        const result = await transporter.sendMail({
            from: `"Calendar Reminder" <${fromEmail}>`,
            to: userEmail,
            subject: subjects[reminderType],
            html,
        });

        console.log('Self reminder sent:', result.messageId);
        return { success: true, messageId: result.messageId };
    } catch (error) {
        console.error('Error sending self reminder:', error);
        return { success: false, error };
    }
}

/**
 * Booking Confirmation - sends to both guest and host
 * - Guest receives invite FROM host
 * - Host receives self-notification
 */
export async function sendBookingConfirmation(data: {
    // Host (the calendar owner)
    hostEmail: string;
    hostName: string;
    hostCredentials?: EmailCredentials;

    // Guest (the person booking)
    guestEmail: string;
    guestName: string;

    // Meeting details
    meetingTitle: string;
    date: string;
    time: string;
    duration: number;
    locationType?: string;
}) {
    const { hostEmail, hostName, hostCredentials, guestEmail, guestName, meetingTitle, date, time, duration, locationType } = data;

    // 1. Send confirmation to guest (FROM host TO guest)
    const guestResult = await sendMeetingInvite({
        senderEmail: hostEmail,
        senderName: hostName,
        senderCredentials: hostCredentials,
        recipientEmail: guestEmail,
        recipientName: guestName,
        meetingTitle: `${meetingTitle} with ${hostName}`,
        date,
        time,
        duration,
        locationType,
        description: `Booked by ${guestName}`,
    });

    // 2. Send self-notification to host (FROM host TO host)
    const hostResult = await sendSelfReminder({
        userEmail: hostEmail,
        userName: hostName,
        userCredentials: hostCredentials,
        meetingTitle: `${meetingTitle} with ${guestName}`,
        date,
        time,
        reminderType: 'confirmation',
    });

    return {
        guestEmailSent: guestResult.success,
        hostEmailSent: hostResult.success,
    };
}

export async function sendDeclineNotification(data: {
    senderEmail: string;
    senderName: string;
    senderCredentials?: EmailCredentials;
    recipientEmail: string;
    recipientName: string;
    meetingTitle: string;
}) {
    const { senderEmail, senderName, senderCredentials, recipientEmail, recipientName, meetingTitle } = data;

    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb; padding: 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 32px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 24px; }
        .header h1 { color: #EF4444; margin: 0; font-size: 24px; }
        .icon { font-size: 48px; margin-bottom: 16px; }
        .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">❌</div>
          <h1>Meeting Declined</h1>
        </div>
        
        <p>Hi ${recipientName},</p>
        <p><strong>${senderName}</strong> has declined the meeting request: <strong>${meetingTitle}</strong>.</p>
        
        <div class="footer">
          <p>You can propose a new time in the app.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    try {
        const transporter = senderCredentials
            ? createTransporter(senderCredentials)
            : getFallbackTransporter();

        if (!transporter) return { success: false, error: 'No email credentials' };

        const fromEmail = senderCredentials?.email || process.env.GMAIL_USER;

        await transporter.sendMail({
            from: `"${senderName}" <${fromEmail}>`,
            to: recipientEmail,
            subject: `❌ Declined: ${meetingTitle}`,
            html,
        });

        return { success: true };
    } catch (error) {
        console.error('Error sending decline notification:', error);
        return { success: false, error };
    }
}

// Legacy exports for backward compatibility
export { sendMeetingInvite as sendHostNotification };
