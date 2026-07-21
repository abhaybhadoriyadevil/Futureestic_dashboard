import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../storage/db';
import type { Dashboard } from '../../types';

interface WorkspaceBackgroundProps {
  dashboard?: Dashboard;
}

export const WorkspaceBackground: React.FC<WorkspaceBackgroundProps> = ({ dashboard }) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  const fileId = dashboard?.backgroundFileId;
  
  // Use dexie-react-hooks to query the file whenever fileId changes
  const fileData = useLiveQuery(
    async () => (fileId ? await db.files.get(fileId) : undefined),
    [fileId]
  );

  useEffect(() => {
    if (fileData?.blob) {
      const url = URL.createObjectURL(fileData.blob);
      setBlobUrl(url);
      
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setBlobUrl(null);
    }
  }, [fileData]);

  if (!dashboard || dashboard.layoutType === 'canvas') {
    return null; // No custom background allowed for canvas
  }

  if (dashboard.backgroundType === 'image' && blobUrl) {
    return (
      <div className="absolute inset-0 z-0 pointer-events-none">
        <img 
          src={blobUrl} 
          alt="Workspace Background" 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>
    );
  }

  if (dashboard.backgroundType === 'video' && blobUrl) {
    return (
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <video 
          src={blobUrl} 
          autoPlay 
          loop 
          muted 
          playsInline
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      </div>
    );
  }

  return null;
};
