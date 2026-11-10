"use client";

import React from "react";
import { NotificationManager, type SentNotification } from "@/components/organisms/NotificationManager";

interface NotificationsPageProps {
  notifications: SentNotification[];
  canSend: boolean;
}

export function NotificationsPage(props: NotificationsPageProps) {
  return (
    <div className="flex-1 bg-[#F9F9F8] dark:bg-[#09090b] min-h-screen py-6 px-4 sm:px-8 transition-colors">
      <div className="max-w-4xl mx-auto space-y-6">
        <NotificationManager {...props} />
      </div>
    </div>
  );
}
