"use client";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const NotificationDrawer = dynamic(() => import("@/components/layout/NotificationDrawer"), { ssr: false });

export default function NotificationDrawerClient() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    window.openNotificationDrawer = () => setOpen(true);
    return () => {
      window.openNotificationDrawer = undefined;
    };
  }, []);

  return <NotificationDrawer open={open} onClose={() => setOpen(false)} />;
} 