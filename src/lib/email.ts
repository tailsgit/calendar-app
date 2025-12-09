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

  // Request ID for actions (Accept/Decline/Reschedule)
  requestId?: string;
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
  reminderType: 'upcoming' | 'starting_soon' | 'confirmation' | 'running_late';
}

/**
 * SCENARIO 1: Meeting Request Between Two People
 * Email FROM: Person A (inviter) → TO: Person B (invitee)
 */
export async function sendMeetingInvite(data: MeetingInviteData) {
  const {
    senderEmail, senderName, senderCredentials,
    recipientEmail, recipientName,
    meetingTitle, date, time, duration, locationType, description,
    requestId
  } = data;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const requestsLink = `${appUrl}/requests`; // Page where they can Accept/Decline
  const rescheduleLink = requestId ? `${appUrl}/?intent=reschedule&requestId=${requestId}` : requestsLink;

  const locationText = locationType === 'VIDEO' ? '📹 Video Call' :
    locationType === 'PHONE' ? '📞 Phone Call' :
      locationType === 'IN_PERSON' ? '📍 In Person' : 'To be determined';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 40px 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 32px; }
        .header-text { color: #6366F1; font-weight: 700; font-size: 24px; letter-spacing: -0.5px; }
        .greeting { color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: center; }
        
        .details-box { background: #F8FAFC; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #E2E8F0; }
        .detail-row { display: flex; padding: 8px 0; }
        .label { color: #64748B; font-size: 14px; width: 80px; font-weight: 500; }
        .value { color: #1E293B; font-size: 15px; font-weight: 600; flex: 1; }

        .btn-primary { 
            display: block; 
            background: #6366F1; 
            color: white; 
            text-align: center; 
            padding: 14px 20px; 
            border-radius: 8px; 
            text-decoration: none; 
            font-weight: 600; 
            font-size: 16px; 
            margin-bottom: 16px;
            box-shadow: 0 2px 4px rgba(99, 102, 241, 0.2);
        }
        .btn-primary:hover { background: #4F46E5; }

        .actions-secondary { display: table; width: 100%; border-collapse: separate; border-spacing: 12px 0; margin: 0 -12px; }
        .action-cell { display: table-cell; width: 50%; }
        
        .btn-secondary {
            display: block;
            background: #F1F5F9;
            color: #475569;
            text-align: center;
            padding: 12px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            border: 1px solid #E2E8F0;
        }
        .btn-secondary:hover { background: #E2E8F0; }

        .btn-decline {
            display: block;
            background: white;
            color: #EF4444;
            text-align: center;
            padding: 12px;
            border-radius: 8px;
            text-decoration: none;
            font-weight: 600;
            font-size: 14px;
            border: 1px solid #FECACA;
        }
        .btn-decline:hover { background: #FEF2F2; }

        .footer { text-align: center; color: #94A3B8; font-size: 13px; margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-text">Meeting Invitation</div>
        </div>
        
        <div class="greeting">
          Hi ${recipientName},<br/>
          <strong>${senderName}</strong> has invited you to a meeting.
        </div>
        
        <div class="details-box">
          <div class="detail-row">
            <div class="label">Topic</div>
            <div class="value">${meetingTitle}</div>
          </div>
          <div class="detail-row">
            <div class="label">Date</div>
            <div class="value">${date}</div>
          </div>
          <div class="detail-row">
            <div class="label">Time</div>
            <div class="value">${time} (${duration} min)</div>
          </div>
          <div class="detail-row">
            <div class="label">Location</div>
            <div class="value">${locationText}</div>
          </div>
          ${description ? `
          <div class="detail-row">
            <div class="label">Notes</div>
            <div class="value">${description}</div>
          </div>
          ` : ''}
        </div>
        
        ${requestId ? `
        <a href="${requestsLink}" class="btn-primary">
          ADD TO CALENDAR
        </a>
        
        <div class="actions-secondary">
          <div class="action-cell">
            <a href="${rescheduleLink}" class="btn-secondary">
              Reschedule
            </a>
          </div>
          <div class="action-cell">
            <a href="${requestsLink}" class="btn-decline">
              Decline
            </a>
          </div>
        </div>
        ` : ''}
        
        <div class="footer">
          Reply to this email to contact ${senderName} directly.
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
      subject: `Invitation: ${meetingTitle}`,
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
    upcoming: `Upcoming: ${meetingTitle}`,
    starting_soon: `Starting Soon: ${meetingTitle}`,
    confirmation: `Confirmed: ${meetingTitle}`,
    running_late: `Running Late: ${meetingTitle}`,
  };

  const messages: Record<string, string> = {
    upcoming: 'You have an upcoming meeting scheduled.',
    starting_soon: 'Your meeting is starting soon! Get ready.',
    confirmation: 'Your meeting has been confirmed.',
    running_late: 'The host is running slightly late.',
  };

  // Professional header colors based on type
  const headerColors: Record<string, string> = {
    upcoming: '#6366F1',      // Indigo
    starting_soon: '#F59E0B', // Amber
    confirmation: '#10B981',  // Emerald
    running_late: '#F43F5E',  // Rose
  };

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 40px 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 32px; }
        .header-text { color: ${headerColors[reminderType] || '#6366F1'}; font-weight: 700; font-size: 24px; letter-spacing: -0.5px; }
        .greeting { color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: center; }
        
        .details-box { background: #F8FAFC; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #E2E8F0; }
        .detail-row { display: flex; padding: 8px 0; }
        .label { color: #64748B; font-size: 14px; width: 80px; font-weight: 500; }
        .value { color: #1E293B; font-size: 15px; font-weight: 600; flex: 1; }
        
        .footer { text-align: center; color: #94A3B8; font-size: 13px; margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-text">${subjects[reminderType]}</div>
        </div>
        
        <div class="greeting">
          Hi ${userName},<br/>
          ${messages[reminderType]}
        </div>
        
        <div class="details-box">
          <div class="detail-row">
            <div class="label">Event</div>
            <div class="value">${meetingTitle}</div>
          </div>
          <div class="detail-row">
            <div class="label">Date</div>
            <div class="value">${date}</div>
          </div>
          <div class="detail-row">
            <div class="label">Time</div>
            <div class="value">${time}</div>
          </div>
        </div>
        
        <div class="footer">
          This is an automated notification from your calendar.
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
  declineReason?: string;
}) {
  const { senderEmail, senderName, senderCredentials, recipientEmail, recipientName, meetingTitle, declineReason } = data;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F8FAFC; padding: 40px 20px; margin: 0; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; padding: 40px; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { text-align: center; margin-bottom: 32px; }
        .header-text { color: #EF4444; font-weight: 700; font-size: 24px; letter-spacing: -0.5px; }
        .greeting { color: #334155; font-size: 16px; line-height: 1.6; margin-bottom: 32px; text-align: center; }
        
        .reason-box { background: #fee2e2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; color: #b91c1c; margin-bottom: 32px; font-style: italic; }

        .footer { text-align: center; color: #94A3B8; font-size: 13px; margin-top: 40px; border-top: 1px solid #E2E8F0; padding-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="header-text">Meeting Declined</div>
        </div>
        
        <div class="greeting">
          Hi ${recipientName},<br/>
          <strong>${senderName}</strong> has declined the meeting request:<br/>
          <strong>${meetingTitle}</strong>
        </div>
        
        ${declineReason ? `
        <div class="reason-box">
          "${declineReason}"
        </div>
        ` : ''}
        
        <div class="footer">
          You can propose a new time in the app.
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
      subject: `Declined: ${meetingTitle}`,
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
