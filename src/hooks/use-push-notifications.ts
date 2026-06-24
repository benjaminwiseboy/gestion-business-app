"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getExistingSubscription,
  getPushPermission,
  getPushSupport,
  sendTestPush,
  subscribeToPush,
  unsubscribeFromPush,
  type PushSupport,
} from "@/lib/push";

interface PushState {
  support: PushSupport;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  isMutating: boolean;
}

export function usePushNotifications() {
  const [state, setState] = useState<PushState>({
    support: "unsupported",
    permission: "unsupported",
    isSubscribed: false,
    isLoading: true,
    isMutating: false,
  });

  const refresh = useCallback(async () => {
    const support = getPushSupport();
    const permission = getPushPermission();
    let isSubscribed = false;
    if (support === "supported") {
      try {
        const sub = await getExistingSubscription();
        isSubscribed = sub !== null;
      } catch {
        isSubscribed = false;
      }
    }
    setState({
      support,
      permission,
      isSubscribed,
      isLoading: false,
      isMutating: false,
    });
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    setState((s) => ({ ...s, isMutating: true }));
    try {
      await subscribeToPush();
      await refresh();
    } catch (err) {
      setState((s) => ({ ...s, isMutating: false }));
      throw err;
    }
  }, [refresh]);

  const unsubscribe = useCallback(async () => {
    setState((s) => ({ ...s, isMutating: true }));
    try {
      await unsubscribeFromPush();
      await refresh();
    } catch (err) {
      setState((s) => ({ ...s, isMutating: false }));
      throw err;
    }
  }, [refresh]);

  const sendTest = useCallback(async () => {
    setState((s) => ({ ...s, isMutating: true }));
    try {
      await sendTestPush();
    } finally {
      setState((s) => ({ ...s, isMutating: false }));
    }
  }, []);

  return { ...state, subscribe, unsubscribe, sendTest, refresh };
}
