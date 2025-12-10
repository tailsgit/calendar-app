"use client";

import { useState, useEffect } from 'react';
import { format, addMinutes } from 'date-fns';
import toast from 'react-hot-toast';

interface MeetingRequestFormProps {
  recipient: {
    id: string;
    name: string | null;
    image: string | null;
    title: string | null;
  };
  initialDate: Date;
  initialTime: number; // hour (0-23)
  onClose: () => void;
  onSuccess: () => void;
}

export default function MeetingRequestForm({
  recipient,
  initialDate,
  initialTime,
  onClose,
  onSuccess,
}: MeetingRequestFormProps) {
  // Initialize start time based on props
  const initStart = new Date(initialDate);
  initStart.setHours(initialTime, 0, 0, 0);

  const [title, setTitle] = useState('');

  // State for flexible times
  const [startTimeStr, setStartTimeStr] = useState(format(initStart, 'HH:mm')); // "15:00"
  const [endTimeStr, setEndTimeStr] = useState(format(addMinutes(initStart, 60), 'HH:mm')); // "16:00"

  const [locationType, setLocationType] = useState('VIDEO');
  const [locationDetails, setLocationDetails] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Reconstruct full Date objects
      const baseDate = format(initialDate, 'yyyy-MM-dd'); // Ensure we stay on same day
      const startDateTime = new Date(`${baseDate}T${startTimeStr}`);
      const endDateTime = new Date(`${baseDate}T${endTimeStr}`);

      // Handle overnight? For simplicity, assume same day. 
      // Validation
      if (endDateTime <= startDateTime) {
        toast.error('End time must be after start time');
        setLoading(false);
        return;
      }

      const durationMins = (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60);

      const res = await fetch('/api/meeting-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: recipient.id,
          title,
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          duration: durationMins,
          locationType,
          locationDetails: locationType === 'VIDEO' ? 'Zoom (Auto-generated)' : locationDetails,
          message,
        }),
      });

      if (res.ok) {
        onSuccess();
        toast.success('Request sent!');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to send request');
      }
    } catch (error) {
      console.error('Error sending request:', error);
      toast.error('Something went wrong');
    }
    setLoading(false);
  };

  return (
    <div className="meeting-request-overlay">
      <div className="meeting-request-panel">
        <div className="panel-header">
          <h2>Request Meeting</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="recipient-info">
          <div className="avatar">
            {recipient.image ? (
              <img src={recipient.image} alt="" />
            ) : (
              recipient.name?.slice(0, 2).toUpperCase() || 'U'
            )}
          </div>
          <div>
            <div className="label">With:</div>
            <div className="name">{recipient.name}</div>
            <div className="title">{recipient.title}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Date & Time</label>
            <div className="datetime-display">
              <div className="date-row">
                {format(initialDate, 'EEEE, MMM d, yyyy')}
              </div>
              <div className="time-row">
                <div className="time-input-group">
                  <label>Start</label>
                  <input
                    type="time"
                    value={startTimeStr}
                    onChange={(e) => setStartTimeStr(e.target.value)}
                    required
                  />
                </div>
                <div className="separator">→</div>
                <div className="time-input-group">
                  <label>End</label>
                  <input
                    type="time"
                    value={endTimeStr}
                    onChange={(e) => setEndTimeStr(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Duration pills removed in favor of flexible end time */}

          <div className="form-group">
            <label>Meeting Title <span className="required">*</span></label>
            <input
              type="text"
              placeholder="What's this meeting about?"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Location</label>
            <div className="radio-group">
              <label className="radio-option">
                <input
                  type="radio"
                  name="location"
                  value="VIDEO"
                  checked={locationType === 'VIDEO'}
                  onChange={e => setLocationType(e.target.value)}
                />
                <span className="radio-label">📹 Video Call (Zoom)</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="location"
                  value="PHONE"
                  checked={locationType === 'PHONE'}
                  onChange={e => setLocationType(e.target.value)}
                />
                <span className="radio-label">📞 Phone Call</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="location"
                  value="IN_PERSON"
                  checked={locationType === 'IN_PERSON'}
                  onChange={e => setLocationType(e.target.value)}
                />
                <span className="radio-label">📍 In Person</span>
              </label>
            </div>
            {locationType !== 'VIDEO' && (
              <input
                type="text"
                className="location-details"
                placeholder={locationType === 'PHONE' ? 'Your phone number' : 'Where?'}
                value={locationDetails}
                onChange={e => setLocationDetails(e.target.value)}
                required
              />
            )}
          </div>

          <div className="form-group">
            <label>Message (Optional)</label>
            <textarea
              placeholder="Add context or agenda items..."
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
            />
          </div>

          <div className="form-actions">
            <button type="button" className="cancel-btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={loading}>
              {loading ? 'Sending...' : 'Send Request →'}
            </button>
          </div>
        </form>
      </div>

      <style jsx>{`
        .meeting-request-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          display: flex;
          justify-content: flex-end;
        }

        .meeting-request-panel {
          width: 100%;
          max-width: 480px;
          background: var(--color-bg-main);
          height: 100%;
          padding: var(--spacing-xl);
          overflow-y: auto;
          box-shadow: -4px 0 20px rgba(0,0,0,0.2);
          animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--spacing-xl);
        }

        .close-btn {
          font-size: 1.5rem;
          color: var(--color-text-secondary);
        }

        .recipient-info {
          display: flex;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-lg);
          margin-bottom: var(--spacing-xl);
        }

        .avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: var(--color-accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          overflow: hidden;
        }
        
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .label {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .name {
          font-weight: 600;
          font-size: 1.1rem;
        }

        .title {
          font-size: 0.9rem;
          color: var(--color-text-secondary);
        }

        .form-group {
          margin-bottom: var(--spacing-lg);
        }

        label {
          display: block;
          font-weight: 500;
          margin-bottom: var(--spacing-xs);
          color: var(--color-text-main);
        }

        .required {
          color: var(--color-error);
        }

        .datetime-display {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .date-row {
          font-weight: 500;
          color: var(--color-text-secondary);
          font-size: 0.9rem;
        }

        .time-row {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .time-input-group {
          display: flex;
          flex-direction: column;
          gap: 4px;
          flex: 1;
        }

        .time-input-group label {
          font-size: 0.75rem;
          color: var(--color-text-tertiary);
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .time-input-group input[type="time"] {
          font-size: 1.1rem;
          padding: 8px 12px;
          font-weight: 500;
          border-color: var(--color-border);
          background: var(--color-bg-main);
          width: 100%;
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .time-input-group input[type="time"]:focus {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 2px var(--color-accent-transparent);
        }

        .separator {
          color: var(--color-text-tertiary);
          font-weight: 500;
          margin-top: 18px; /* Visual alignment with inputs */
        }

        /* Removed duration-btn styles */

        input[type="text"], textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          background: var(--color-bg-secondary); /* Matches previous style or global input style */
          color: var(--color-text-main);
          font-size: 1rem;
        }

        input:focus, textarea:focus {
          outline: 2px solid var(--color-accent);
          border-color: transparent;
        }

        .radio-group {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
          margin-bottom: var(--spacing-sm);
        }

        .radio-option {
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
          cursor: pointer;
        }

        .location-details {
          margin-top: var(--spacing-sm);
        }

        .form-actions {
          display: flex;
          gap: var(--spacing-md);
          margin-top: var(--spacing-xl);
          padding-top: var(--spacing-lg);
          border-top: 1px solid var(--color-border);
        }

        .cancel-btn, .submit-btn {
          flex: 1;
          padding: 1rem;
          border-radius: var(--radius-md);
          font-weight: 600;
          font-size: 1rem;
        }

        .cancel-btn {
          background: var(--color-bg-secondary);
          color: var(--color-text-main);
        }

        .submit-btn {
          background: var(--color-secondary-brand);
          color: white;
        }

        .submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
