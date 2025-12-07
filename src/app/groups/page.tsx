"use client";

import GroupManager from '@/components/groups/GroupManager';

export default function GroupsPage() {
    return (
        <div className="groups-page">
            <div className="page-header">
                <h1>Groups</h1>
                <p>Manage your organization and team groups</p>
            </div>

            <GroupManager />

            <style jsx>{`
        .groups-page {
          height: 100%;
        }
        
        .page-header {
          margin-bottom: var(--spacing-lg);
        }
        
        .page-header h1 {
          margin-bottom: var(--spacing-xs);
        }
        
        .page-header p {
          color: var(--color-text-secondary);
        }
      `}</style>
        </div>
    );
}
