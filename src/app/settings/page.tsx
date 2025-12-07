"use client";

import { useState, useEffect, useRef } from 'react';
import { signIn } from 'next-auth/react';
import ThemeToggle from '@/components/ui/ThemeToggle';
import AvailabilitySettings from '@/components/settings/AvailabilitySettings';
import toast from 'react-hot-toast';

interface Integration {
    id: string;
    name: string;
    icon: string;
    description: string;
    connected: boolean;
    type: 'calendar' | 'video';
}

const INTEGRATIONS: Integration[] = [
    {
        id: 'google-calendar',
        name: 'Google Calendar',
        icon: '📅',
        description: 'Sync your Google Calendar events',
        connected: false,
        type: 'calendar',
    },
    {
        id: 'outlook',
        name: 'Outlook Calendar',
        icon: '📧',
        description: 'Sync with Microsoft Outlook',
        connected: false,
        type: 'calendar',
    },
    {
        id: 'zoom',
        name: 'Zoom',
        icon: '📹',
        description: 'Auto-generate Zoom meeting links',
        connected: false,
        type: 'video',
    },
    {
        id: 'google-meet',
        name: 'Google Meet',
        icon: '🎥',
        description: 'Auto-generate Google Meet links',
        connected: false,
        type: 'video',
    },
];

export default function SettingsPage() {
    const [integrations, setIntegrations] = useState(INTEGRATIONS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    const [profile, setProfile] = useState({
        name: '',
        email: '',
        title: '',
        department: '',
        status: 'available',
        image: '',
        timeZone: 'America/New_York',
        lunchEnabled: false,
        lunchStart: '12:00',
        lunchEnd: '13:00',
        meetingReminders: '5',
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await fetch('/api/user/profile');
            if (res.ok) {
                const data = await res.json();
                setProfile({
                    name: data.name || '',
                    email: data.email || '',
                    title: data.title || '',
                    department: data.department || '',
                    status: data.status || 'available',
                    image: data.image || '',
                    timeZone: data.timeZone || 'America/New_York',
                    lunchEnabled: data.lunchEnabled || false,
                    lunchStart: data.lunchStart || '12:00',
                    lunchEnd: data.lunchEnd || '13:00',
                    meetingReminders: data.meetingReminders || '5',
                });

                // Update integrations connection state
                const accountProviders = data.accounts?.map((a: any) => a.provider) || [];
                setIntegrations(prev => prev.map(i => {
                    let isConnected = false;
                    if (i.id === 'google-calendar') isConnected = accountProviders.includes('google');
                    // Provider ID for Outlook can be microsoft-entra-id (new) or azure-ad (old) depending on adapter
                    if (i.id === 'outlook') isConnected = accountProviders.includes('microsoft-entra-id') || accountProviders.includes('azure-ad');

                    return { ...i, connected: isConnected };
                }));
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
        setLoading(false);
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const data = await res.json();
                setProfile(prev => ({ ...prev, image: data.url }));
                toast.success('Profile picture updated');
            } else {
                toast.error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading file:', error);
            toast.error('Upload failed');
        }
        setUploading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(profile),
            });

            if (res.ok) {
                // Visual feedback handled by button state or toast if added
                toast.success('Profile saved successfully');
            } else {
                const errorData = await res.json().catch(() => ({}));
                console.error('Failed to save profile', res.status, errorData);
                toast.error(`Failed to save profile: ${errorData.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            toast.error('Error saving profile');
        }

        // Keep "Saving..." state for a moment to show activity, then revert or show success
        setTimeout(() => setSaving(false), 500);
    };

    const handleConnect = async (id: string) => {
        const integration = integrations.find(i => i.id === id);

        if (integration?.connected) {
            // Disconnect logic
            try {
                const res = await fetch('/api/user/accounts', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ provider: id }),
                });

                if (res.ok) {
                    setIntegrations(prev => prev.map(i =>
                        i.id === id ? { ...i, connected: false } : i
                    ));
                    toast.success(`Disconnected ${integration.name}`);
                } else {
                    toast.error('Failed to disconnect');
                }
            } catch (e) {
                console.error(e);
                toast.error('Error disconnecting');
            }
            return;
        }

        // Connect logic
        if (id === 'google-calendar') {
            signIn('google', { callbackUrl: '/settings' });
        } else if (id === 'outlook') {
            signIn('microsoft-entra-id', { callbackUrl: '/settings' });
        } else {
            // Fallback for visual toggle on others for now
            setIntegrations(prev => prev.map(i =>
                i.id === id ? { ...i, connected: !i.connected } : i
            ));
        }
    };

    const calendarIntegrations = integrations.filter(i => i.type === 'calendar');
    const videoIntegrations = integrations.filter(i => i.type === 'video');

    if (loading) return <div className="p-8 text-center">Loading settings...</div>;

    return (
        <div className="settings-page">
            <h1>Settings</h1>

            {/* Appearance Section */}
            <section className="settings-section">
                <h2>Appearance</h2>
                <div className="card">
                    <div className="setting-row">
                        <div className="setting-info">
                            <span className="setting-label">Dark Mode</span>
                            <span className="setting-description">Switch between light and dark themes</span>
                        </div>
                        <ThemeToggle />
                    </div>
                </div>
            </section>

            {/* Profile Section */}
            <section className="settings-section">
                <h2>Profile</h2>
                <div className="card">
                    <div className="profile-header-edit">
                        <div className="avatar-edit" onClick={() => fileInputRef.current?.click()}>
                            {profile.image ? (
                                <img src={profile.image} alt="Profile" />
                            ) : (
                                <div className="avatar-placeholder">
                                    {profile.name?.slice(0, 2).toUpperCase() || 'U'}
                                </div>
                            )}
                            <div className="avatar-overlay">
                                <span>{uploading ? '...' : '📷'}</span>
                            </div>
                        </div>
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            style={{ display: 'none' }}
                        />
                        <div className="profile-header-text">
                            <h3>Profile Picture</h3>
                            <p>Click to upload a new photo</p>
                        </div>
                    </div>

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Full Name</label>
                            <input
                                type="text"
                                value={profile.name}
                                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            />
                        </div>
                        <div className="form-group">
                            <label>Email</label>
                            <input
                                type="email"
                                value={profile.email}
                                disabled
                                className="disabled"
                            />
                        </div>
                        <div className="form-group">
                            <label>Job Title</label>
                            <input
                                type="text"
                                value={profile.title}
                                onChange={(e) => setProfile({ ...profile, title: e.target.value })}
                                placeholder="e.g. Senior Developer"
                            />
                        </div>
                        <div className="form-group">
                            <label>Department</label>
                            <input
                                type="text"
                                value={profile.department}
                                onChange={(e) => setProfile({ ...profile, department: e.target.value })}
                                placeholder="e.g. Engineering"
                            />
                        </div>
                        <div className="form-group">
                            <label>Status</label>
                            <select
                                value={profile.status}
                                onChange={(e) => setProfile({ ...profile, status: e.target.value })}
                            >
                                <option value="available">🟢 Available</option>
                                <option value="busy">🔴 Busy</option>
                                <option value="away">🟡 Away</option>
                                <option value="offline">⚪ Offline</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Timezone</label>
                            <select
                                value={profile.timeZone}
                                onChange={(e) => setProfile({ ...profile, timeZone: e.target.value })}
                            >
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Chicago">Central Time (CT)</option>
                                <option value="America/Denver">Mountain Time (MT)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                <option value="Europe/London">London (GMT)</option>
                                <option value="Europe/Paris">Paris (CET)</option>
                            </select>
                        </div>
                    </div>

                    <button
                        className="btn btn-primary save-btn"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </section>

            {/* Lunch Settings */}
            <section className="settings-section">
                <h2>Lunch Break</h2>
                <div className="card">
                    <div className="setting-row mb-4">
                        <div className="setting-info">
                            <span className="setting-label">Scheduled Lunch</span>
                            <span className="setting-description">Automatically block off time for lunch daily</span>
                        </div>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={profile.lunchEnabled}
                                onChange={(e) => setProfile({ ...profile, lunchEnabled: e.target.checked })}
                            />
                            <span className="slider round"></span>
                        </label>
                    </div>

                    {profile.lunchEnabled && (
                        <div className="form-grid" style={{ marginBottom: 0 }}>
                            <div className="form-group">
                                <label>Start Time</label>
                                <input
                                    type="time"
                                    value={profile.lunchStart}
                                    onChange={(e) => setProfile({ ...profile, lunchStart: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label>End Time</label>
                                <input
                                    type="time"
                                    value={profile.lunchEnd}
                                    onChange={(e) => setProfile({ ...profile, lunchEnd: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <button
                        className="btn btn-primary save-btn mt-4"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saved!' : 'Save Lunch Settings'}
                    </button>
                </div>
            </section>

            {/* Event Notifications */}
            <section className="settings-section">
                <h2>Event Notifications</h2>
                <div className="card">
                    <div className="setting-info mb-4">
                        <span className="setting-label">Meeting Reminders</span>
                        <span className="setting-description">Receive notifications before your events start</span>
                    </div>

                    <div className="flex gap-2 flex-wrap" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {['5', '10', '15', '30', '60'].map((mins) => {
                            const current = profile.meetingReminders?.split(',') || [];
                            const isActive = current.includes(mins);
                            return (
                                <button
                                    type="button"
                                    key={mins}
                                    className={`reminder-pill ${isActive ? 'active' : ''}`}
                                    onClick={() => {
                                        let newSet = new Set(current);
                                        if (isActive) newSet.delete(mins);
                                        else newSet.add(mins);
                                        // Remove empty strings and join
                                        const newVal = Array.from(newSet).filter(Boolean).join(',');
                                        setProfile({ ...profile, meetingReminders: newVal });
                                    }}
                                >
                                    {mins} min
                                </button>
                            );
                        })}
                    </div>
                    <p style={{ marginTop: '12px', fontSize: '0.85rem', color: '#666' }}>
                        Selected: {profile.meetingReminders ? profile.meetingReminders.split(',').map(m => `${m}m`).join(', ') : 'None'}
                    </p>

                    <button
                        className="btn btn-primary save-btn mt-4"
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? 'Saved!' : 'Save Notification Settings'}
                    </button>
                </div>
            </section>

            {/* Availability Section */}
            <section className="settings-section">
                <h2>Availability</h2>
                <div className="card">
                    <AvailabilitySettings />
                </div>
            </section>

            {/* Calendar Integrations */}
            <section className="settings-section">
                <h2>Calendar Integrations</h2>
                <div className="integrations-grid">
                    {calendarIntegrations.map(integration => (
                        <div key={integration.id} className="integration-card card">
                            <div className="integration-info">
                                <span className="integration-icon">{integration.icon}</span>
                                <div>
                                    <h3>{integration.name}</h3>
                                    <p>{integration.description}</p>
                                </div>
                            </div>
                            <button
                                className={`btn ${integration.connected ? 'btn-secondary' : 'btn-primary'}`}
                                onClick={() => handleConnect(integration.id)}
                            >
                                {integration.connected ? 'Disconnect' : 'Connect'}
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <style jsx>{`
        .settings-page {
          max-width: 800px;
        }

        .settings-page h1 {
          font-size: 1.75rem;
          margin-bottom: var(--spacing-xl);
        }

        .settings-section {
          margin-bottom: var(--spacing-xl);
        }

        .settings-section h2 {
          font-size: 1.25rem;
          margin-bottom: var(--spacing-md);
          color: var(--color-text-secondary);
        }

        .card {
            background: var(--color-bg-main);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-lg);
            padding: var(--spacing-lg);
        }

        .setting-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .setting-info {
          display: flex;
          flex-direction: column;
        }

        .setting-label {
          font-weight: 500;
        }

        .setting-description {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }

        .profile-header-edit {
            display: flex;
            align-items: center;
            gap: var(--spacing-lg);
            margin-bottom: var(--spacing-xl);
        }

        .avatar-edit {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            background: var(--color-accent);
            position: relative;
            cursor: pointer;
            overflow: hidden;
        }

        .avatar-edit img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .avatar-placeholder {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 2rem;
            font-weight: 600;
        }

        .avatar-overlay {
            position: absolute;
            inset: 0;
            background: rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.2s;
            color: white;
            font-size: 1.5rem;
        }

        .avatar-edit:hover .avatar-overlay {
            opacity: 1;
        }

        .profile-header-text h3 {
            margin: 0;
            font-size: 1.1rem;
        }

        .profile-header-text p {
            margin: 0;
            color: var(--color-text-secondary);
            font-size: 0.9rem;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: var(--spacing-md);
            margin-bottom: var(--spacing-lg);
        }

        .form-group {
          margin-bottom: var(--spacing-sm);
        }

        .form-group label {
          display: block;
          margin-bottom: var(--spacing-xs);
          font-weight: 500;
          font-size: 0.9rem;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 0.6rem;
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          font-size: 1rem;
          background-color: var(--color-bg-main);
          color: var(--color-text-main);
        }

        .form-group input.disabled {
            background-color: var(--color-bg-secondary);
            cursor: not-allowed;
            opacity: 0.7;
        }

        .save-btn {
            width: 100%;
            padding: 0.75rem;
            font-size: 1rem;
            font-weight: 600;
        }

        .btn {
            padding: 0.5rem 1rem;
            border-radius: var(--radius-md);
            cursor: pointer;
            transition: opacity 0.2s;
        }

        .btn:disabled {
            opacity: 0.7;
            cursor: not-allowed;
        }

        .btn-primary {
            background: var(--color-accent);
            color: white;
        }

        .btn-secondary {
            background: var(--color-bg-secondary);
            color: var(--color-text-main);
        }

        .integrations-grid {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-md);
        }

        .integration-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .integration-info {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
        }

        .integration-icon {
          font-size: 2rem;
        }

        .integration-card h3 {
          font-size: 1rem;
          margin-bottom: 2px;
        }

        .integration-card p {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }
        .integration-card p {
          font-size: 0.85rem;
          color: var(--color-text-secondary);
        }

        /* Toggle Switch */
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 24px;
        }

        .switch input { 
          opacity: 0;
          width: 0;
          height: 0;
        }

        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #ccc;
          transition: .4s;
          border-radius: 34px;
        }

        .slider:before {
          position: absolute;
          content: "";
          height: 16px;
          width: 16px;
          left: 4px;
          bottom: 4px;
          background-color: white;
          transition: .4s;
          border-radius: 50%;
        }

        input:checked + .slider {
          background-color: var(--color-accent);
        }

        input:checked + .slider:before {
          transform: translateX(26px);
        }

        .mb-4 {
            margin-bottom: 1rem;
        }

        .reminder-pill {
            padding: 6px 16px;
            border-radius: 20px;
            border: 1px solid var(--color-border);
            background: var(--color-bg-main);
            cursor: pointer;
            font-size: 0.9rem;
            transition: all 0.2s;
        }

        .reminder-pill.active {
            background: var(--color-accent);
            color: white;
            border-color: var(--color-accent);
        }

        .reminder-pill:hover:not(.active) {
            background: var(--color-bg-secondary);
        }
      `}</style>
        </div>
    );
}
