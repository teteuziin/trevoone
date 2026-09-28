"use client";

import { useEffect } from "react";
import { recordActivityHeartbeatAction } from "./activity-action";

const HEARTBEAT_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

interface ActivityHeartbeatProps {
  slug: string;
}

export function ActivityHeartbeat({ slug }: ActivityHeartbeatProps) {
  useEffect(() => {
    if (!slug || typeof window === "undefined") return;

    const storageKey = `trevo_hb_${slug}`;
    const now = Date.now();
    const lastHeartbeat = sessionStorage.getItem(storageKey);

    if (lastHeartbeat) {
      const lastTs = parseInt(lastHeartbeat, 10);
      if (!isNaN(lastTs) && now - lastTs < HEARTBEAT_THROTTLE_MS) {
        return; // Throttled on client
      }
    }

    sessionStorage.setItem(storageKey, String(now));
    recordActivityHeartbeatAction(slug).catch(() => {});
  }, [slug]);

  return null;
}
