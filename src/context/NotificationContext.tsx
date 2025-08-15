
"use client";

import React, { createContext, useState, useCallback, ReactNode, Dispatch, SetStateAction } from 'react';
import { v4 as uuidv4 } from 'uuid';

// This is now just the shape of the notification object
interface Notification {
  id: string;
  title: string;
  description: string;
  isRead?: boolean;
  createdAt?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  setNotifications: Dispatch<SetStateAction<Notification[]>>;
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider = ({ children }: { children: ReactNode }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications }}>
      {children}
    </NotificationContext.Provider>
  );
};
