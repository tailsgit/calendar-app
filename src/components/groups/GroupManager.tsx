"use client";

import { useState, useEffect } from 'react';

interface Group {
  id: string;
  name: string;
  description: string | null;
  inviteCode: string;
  leader: { id: string; name: string | null; image: string | null };
  _count?: { members: number };
}

interface Member {
  id: string;
  status: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

export default function GroupManager() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLeader, setIsLeader] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (error) {
      console.error('Error fetching groups:', error);
    }
    setLoading(false);
  };

  const fetchMembers = async (groupId: string) => {
    try {
      const res = await fetch(`/api/groups/${groupId}/members`);
      if (res.ok) {
        const data = await res.json();
        console.log('Group Members Data:', data);
        setMembers(data.members || []);
        setIsLeader(data.isLeader || false);
      }
    } catch (error) {
      console.error('Error fetching members:', error);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newGroupName, description: newGroupDesc }),
      });
      if (res.ok) {
        const data = await res.json();
        setGroups([...groups, data.group]);
        setShowCreateForm(false);
        setNewGroupName('');
        setNewGroupDesc('');
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const handleMemberAction = async (memberId: string, action: 'approve' | 'reject') => {
    if (!selectedGroup) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroup.id}/members`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId, action }),
      });
      if (res.ok) {
        fetchMembers(selectedGroup.id);
      }
    } catch (error) {
      console.error('Error updating member:', error);
    }
  };

  const copyInviteLink = (inviteCode: string) => {
    const link = `${window.location.origin}/join/${inviteCode}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const selectGroup = (group: Group) => {
    setSelectedGroup(group);
    fetchMembers(group.id);
  };

  return (
    <div className="group-manager">
      <div className="groups-sidebar">
        <div className="sidebar-header">
          <h3>Your Groups</h3>
          <button className="create-btn" onClick={() => setShowCreateForm(true)}>
            + New
          </button>
        </div>

        {loading ? (
          <div className="loading">Loading...</div>
        ) : groups.length === 0 ? (
          <div className="empty-state">
            <p>No groups yet</p>
            <button onClick={() => setShowCreateForm(true)}>Create Your First Group</button>
          </div>
        ) : (
          <div className="groups-list">
            {groups.map(group => (
              <div
                key={group.id}
                className={`group-item ${selectedGroup?.id === group.id ? 'active' : ''}`}
                onClick={() => selectGroup(group)}
              >
                <div className="group-name">{group.name}</div>
                <div className="group-meta">{group._count?.members || 0} members</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="group-content">
        {selectedGroup ? (
          <>
            <div className="content-header">
              <div>
                <h2>{selectedGroup.name}</h2>
                {selectedGroup.description && <p>{selectedGroup.description}</p>}
              </div>
              <button
                className="invite-btn"
                onClick={() => copyInviteLink(selectedGroup.inviteCode)}
              >
                {copiedLink ? '✅ Copied!' : '🔗 Copy Invite Link'}
              </button>
            </div>

            <div className="members-section">
              <h3>Members</h3>
              {members.length === 0 ? (
                <p className="no-members">No members yet. Share the invite link!</p>
              ) : (
                <div className="members-list">
                  {members.map(member => (
                    <div key={member.id} className={`member-item ${member.status}`}>
                      <div className="member-avatar">
                        {member.user.image ? (
                          <img src={member.user.image} alt="" />
                        ) : (
                          member.user.name?.slice(0, 2).toUpperCase() || 'U'
                        )}
                      </div>
                      <div className="member-info">
                        <div className="member-name">
                          {member.user.name || member.user.email}
                          {member.role === 'leader' && <span className="role-badge">👑 Leader</span>}
                        </div>
                        <div className="member-email">{member.user.email}</div>
                      </div>
                      {isLeader && member.status === 'pending' && (
                        <div className="member-actions">
                          <button
                            className="approve-btn"
                            onClick={() => handleMemberAction(member.id, 'approve')}
                          >
                            ✓
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleMemberAction(member.id, 'reject')}
                          >
                            ✗
                          </button>
                        </div>
                      )}
                      {member.status === 'pending' && !isLeader && (
                        <span className="pending-badge">Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="no-selection">
            <h3>Select a group</h3>
            <p>Or create a new one to get started</p>
          </div>
        )}
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Create New Group</h3>
            <form onSubmit={createGroup}>
              <input
                type="text"
                placeholder="Group Name (e.g., Marketing Team)"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                required
              />
              <textarea
                placeholder="Description (optional)"
                value={newGroupDesc}
                onChange={e => setNewGroupDesc(e.target.value)}
                rows={3}
              />
              <div className="modal-actions">
                <button type="button" onClick={() => setShowCreateForm(false)}>Cancel</button>
                <button type="submit" className="primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .group-manager {
          display: flex;
          height: 100%;
          min-height: 500px;
          background: var(--color-bg-main);
          border-radius: var(--radius-lg);
          border: 1px solid var(--color-border);
          overflow: hidden;
        }

        .groups-sidebar {
          width: 280px;
          border-right: 1px solid var(--color-border);
          display: flex;
          flex-direction: column;
        }

        .sidebar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--spacing-md);
          border-bottom: 1px solid var(--color-border);
        }

        .sidebar-header h3 {
          font-size: 1rem;
        }

        .create-btn {
          padding: 0.25rem 0.75rem;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-md);
          font-size: 0.85rem;
        }

        .groups-list {
          flex: 1;
          overflow-y: auto;
        }

        .group-item {
          padding: var(--spacing-md);
          cursor: pointer;
          border-bottom: 1px solid var(--color-border);
          transition: background-color var(--transition-fast);
        }

        .group-item:hover, .group-item.active {
          background: var(--color-bg-secondary);
        }

        .group-name {
          font-weight: 600;
        }

        .group-meta {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .group-content {
          flex: 1;
          padding: var(--spacing-lg);
          overflow-y: auto;
        }

        .content-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--spacing-lg);
        }

        .content-header h2 {
          margin-bottom: var(--spacing-xs);
        }

        .content-header p {
          color: var(--color-text-secondary);
        }

        .invite-btn {
          padding: 0.5rem 1rem;
          background: var(--color-bg-secondary);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .invite-btn:hover {
          background: var(--color-border);
        }

        .members-section h3 {
          margin-bottom: var(--spacing-md);
        }

        .members-list {
          display: flex;
          flex-direction: column;
          gap: var(--spacing-sm);
        }

        .member-item {
          display: flex;
          align-items: center;
          gap: var(--spacing-md);
          padding: var(--spacing-md);
          background: var(--color-bg-secondary);
          border-radius: var(--radius-md);
        }

        .member-item.pending {
          opacity: 0.7;
          border: 1px dashed var(--color-border);
        }

        .member-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: var(--color-accent);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          overflow: hidden;
        }

        .member-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .member-info {
          flex: 1;
        }

        .member-name {
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: var(--spacing-sm);
        }

        .member-email {
          font-size: 0.8rem;
          color: var(--color-text-secondary);
        }

        .role-badge {
          font-size: 0.75rem;
          background: var(--color-warning);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
        }

        .pending-badge {
          font-size: 0.75rem;
          background: var(--color-warning);
          color: white;
          padding: 4px 8px;
          border-radius: var(--radius-md);
        }

        .member-actions {
          display: flex;
          gap: var(--spacing-xs);
        }

        .approve-btn, .reject-btn {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 1rem;
        }

        .approve-btn {
          background: var(--color-success);
          color: white;
        }

        .reject-btn {
          background: var(--color-error);
          color: white;
        }

        .no-selection, .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: var(--color-text-secondary);
          text-align: center;
        }

        .empty-state button, .no-selection button {
          margin-top: var(--spacing-md);
          padding: 0.5rem 1rem;
          background: var(--color-accent);
          color: white;
          border-radius: var(--radius-md);
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal {
          background: var(--color-bg-main);
          padding: var(--spacing-xl);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 400px;
        }

        .modal h3 {
          margin-bottom: var(--spacing-lg);
        }

        .modal input, .modal textarea {
          width: 100%;
          padding: var(--spacing-sm);
          border: 1px solid var(--color-border);
          border-radius: var(--radius-md);
          margin-bottom: var(--spacing-md);
          background: var(--color-bg-secondary);
          color: var(--color-text-main);
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: var(--spacing-sm);
        }

        .modal-actions button {
          padding: 0.5rem 1rem;
          border-radius: var(--radius-md);
          cursor: pointer;
        }

        .modal-actions button.primary {
          background: var(--color-accent);
          color: white;
        }

        .loading {
          padding: var(--spacing-lg);
          text-align: center;
          color: var(--color-text-secondary);
        }

        .no-members {
          color: var(--color-text-secondary);
          text-align: center;
          padding: var(--spacing-xl);
        }

        @media (max-width: 768px) {
          .group-manager {
            flex-direction: column;
          }
          .groups-sidebar {
            width: 100%;
            max-height: 200px;
            border-right: none;
            border-bottom: 1px solid var(--color-border);
          }
        }
      `}</style>
    </div>
  );
}
