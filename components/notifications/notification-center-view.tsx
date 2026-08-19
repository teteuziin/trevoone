"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { UserNotificationDTO } from "@/types/notifications";
import {
  markNotificationReadAction,
  markAllNotificationsReadAction,
  registerPushSubscriptionAction,
  revokePushSubscriptionAction,
} from "@/app/notificacoes/actions";

interface NotificationCenterViewProps {
  initialNotifications: UserNotificationDTO[];
  initialTotal: number;
  initialUnreadCount: number;
  currentPage: number;
  totalPages: number;
  vapidPublicKey: string | null;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} às ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

export function NotificationCenterView({
  initialNotifications,
  initialTotal,
  initialUnreadCount,
  currentPage,
  totalPages,
  vapidPublicKey,
}: NotificationCenterViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [notifications, setNotifications] = useState<UserNotificationDTO[]>(initialNotifications);
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);

  const [prevInitial, setPrevInitial] = useState({
    notifications: initialNotifications,
    unreadCount: initialUnreadCount,
  });

  // Adjust state during render when props change
  if (
    prevInitial.notifications !== initialNotifications ||
    prevInitial.unreadCount !== initialUnreadCount
  ) {
    setPrevInitial({
      notifications: initialNotifications,
      unreadCount: initialUnreadCount,
    });
    setNotifications(initialNotifications);
    setUnreadCount(initialUnreadCount);
  }

  // Web Push Device State
  const [pushSupported] = useState<boolean | null>(() => {
    if (typeof window === "undefined") return null;
    return (
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    );
  });

  const [pushPermission, setPushPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      return Notification.permission;
    }
    return "default";
  });

  const [isPushSubscribed, setIsPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window)
    ) {
      return;
    }

    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsPushSubscribed(!!sub);
      })
      .catch(() => {
        // Silently ignore
      });
  }, []);

  async function handleTogglePush() {
    if (!pushSupported || !vapidPublicKey) {
      setPushFeedback({
        type: "error",
        message: "Notificações neste dispositivo estão indisponíveis no momento.",
      });
      return;
    }

    setPushLoading(true);
    setPushFeedback(null);

    try {
      const reg = await navigator.serviceWorker.ready;

      if (isPushSubscribed) {
        // Unsubscribe
        const currentSub = await reg.pushManager.getSubscription();
        if (currentSub) {
          await currentSub.unsubscribe();
          await revokePushSubscriptionAction(currentSub.endpoint);
        }
        setIsPushSubscribed(false);
        setPushFeedback({
          type: "success",
          message: "Notificações desativadas para este dispositivo.",
        });
      } else {
        // Request Permission & Subscribe
        const perm = await Notification.requestPermission();
        setPushPermission(perm);

        if (perm !== "granted") {
          setPushFeedback({
            type: "error",
            message: "Permissão de notificações não concedida no navegador.",
          });
          setPushLoading(false);
          return;
        }

        const appServerKey = urlBase64ToUint8Array(vapidPublicKey);
        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: appServerKey.buffer as ArrayBuffer,
        });

        const subJson = sub.toJSON();
        const p256dh = subJson.keys?.p256dh;
        const auth = subJson.keys?.auth;

        if (!p256dh || !auth) {
          throw new Error("Falha ao obter chaves de criptografia da assinatura.");
        }

        const res = await registerPushSubscriptionAction({
          endpoint: sub.endpoint,
          p256dh,
          auth,
          expirationTime: sub.expirationTime || null,
          userAgent: navigator.userAgent,
        });

        if (res.success) {
          setIsPushSubscribed(true);
          setPushFeedback({
            type: "success",
            message: "Notificações ativadas com sucesso neste dispositivo!",
          });
        } else {
          setPushFeedback({
            type: "error",
            message: "Falha ao registrar assinatura no servidor.",
          });
        }
      }
    } catch {
      setPushFeedback({
        type: "error",
        message: "Ocorreu um erro ao atualizar as notificações do dispositivo.",
      });
    } finally {
      setPushLoading(false);
    }
  }

  function handleMarkRead(publicId: string) {
    setNotifications((prev) =>
      prev.map((n) => (n.publicId === publicId ? { ...n, readAt: new Date().toISOString() } : n))
    );
    setUnreadCount((prev) => Math.max(prev - 1, 0));

    startTransition(async () => {
      await markNotificationReadAction(publicId);
      router.refresh();
    });
  }

  function handleMarkAllRead() {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() }))
    );
    setUnreadCount(0);

    startTransition(async () => {
      await markAllNotificationsReadAction();
      router.refresh();
    });
  }

  const displayedNotifications = filterUnreadOnly
    ? notifications.filter((n) => !n.readAt)
    : notifications;

  return (
    <div className="space-y-6">
      {/* Push Device Configuration Banner */}
      <div className="bg-white rounded-2xl border border-zinc-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">
              Notificações do Dispositivo
            </span>
            {pushSupported && isPushSubscribed && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-[#008f4c] border border-emerald-200">
                Ativo
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-500 leading-relaxed max-w-xl">
            Receba avisos imediatos de treinos, dietas, pagamentos e atualizações importantes diretamente na tela do seu aparelho.
          </p>
          {pushFeedback && (
            <p
              className={`text-xs font-medium pt-1 ${
                pushFeedback.type === "success" ? "text-[#008f4c]" : "text-rose-600"
              }`}
            >
              {pushFeedback.message}
            </p>
          )}
        </div>

        <div className="shrink-0">
          {pushSupported === false ? (
            <span className="text-xs text-zinc-400 font-medium">Não suportado neste navegador</span>
          ) : pushPermission === "denied" ? (
            <span className="text-xs text-rose-600 font-medium">Bloqueado no navegador</span>
          ) : (
            <button
              type="button"
              disabled={pushLoading || !vapidPublicKey}
              onClick={handleTogglePush}
              className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-offset-1 cursor-pointer disabled:opacity-60 ${
                isPushSubscribed
                  ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200 focus:ring-zinc-400"
                  : "bg-[#00a859] text-white hover:bg-[#008f4c] focus:ring-[#00a859]"
              }`}
            >
              {pushLoading
                ? "Processando..."
                : isPushSubscribed
                ? "Desativar neste dispositivo"
                : "Ativar neste dispositivo"}
            </button>
          )}
        </div>
      </div>

      {/* Control Bar: Filters & Mark All Read */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 rounded-xl border border-zinc-200/80">
          <button
            type="button"
            onClick={() => setFilterUnreadOnly(false)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              !filterUnreadOnly
                ? "bg-white text-zinc-900 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Todas ({initialTotal})
          </button>
          <button
            type="button"
            onClick={() => setFilterUnreadOnly(true)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
              filterUnreadOnly
                ? "bg-white text-zinc-900 shadow-2xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Não lidas ({unreadCount})
          </button>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleMarkAllRead}
            className="text-xs font-medium text-[#008f4c] hover:text-[#00733d] hover:underline cursor-pointer disabled:opacity-50"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {displayedNotifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center shadow-xs">
            <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center mx-auto mb-3 text-zinc-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 mb-1">
              Nenhuma notificação {filterUnreadOnly ? "não lida" : ""}
            </h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {filterUnreadOnly
                ? "Você leu todas as notificações recentes."
                : "Quando houver novidades sobre seus treinos, planos ou consultorias, elas aparecerão aqui."}
            </p>
          </div>
        ) : (
          displayedNotifications.map((notif) => {
            const isUnread = !notif.readAt;

            return (
              <div
                key={notif.publicId}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs ${
                  isUnread
                    ? "border-[#00a859]/30 bg-emerald-50/10"
                    : "border-zinc-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[#00a859] shrink-0" aria-label="Não lida" />
                      )}

                      {notif.priority === "CRITICAL" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
                          Urgente
                        </span>
                      )}

                      {notif.priority === "HIGH" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                          Importante
                        </span>
                      )}

                      {notif.consultancyName && (
                        <span className="text-xs font-semibold text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded-md">
                          {notif.consultancyName}
                        </span>
                      )}

                      <span className="text-[11px] text-zinc-400">
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className={`text-sm font-semibold leading-snug ${isUnread ? "text-zinc-900" : "text-zinc-700"}`}>
                      {notif.title}
                    </h4>

                    <p className="text-xs text-zinc-600 leading-relaxed">
                      {notif.body}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notif.publicId)}
                        title="Marcar como lida"
                        className="p-1.5 text-zinc-400 hover:text-[#00a859] rounded-lg hover:bg-emerald-50 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {notif.deepLink && (
                  <div className="mt-3 pt-3 border-t border-zinc-100 flex items-center justify-end">
                    <Link
                      href={notif.deepLink}
                      onClick={() => {
                        if (isUnread) handleMarkRead(notif.publicId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#008f4c] bg-emerald-50 hover:bg-emerald-100/80 rounded-lg transition-colors"
                    >
                      <span>Acessar</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-zinc-200 text-xs">
          <Link
            href={`/notificacoes?pagina=${Math.max(currentPage - 1, 1)}`}
            aria-disabled={currentPage <= 1}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              currentPage <= 1
                ? "pointer-events-none opacity-40 border-zinc-200 text-zinc-400"
                : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Anterior
          </Link>

          <span className="text-zinc-500 font-medium">
            Página {currentPage} de {totalPages}
          </span>

          <Link
            href={`/notificacoes?pagina=${Math.min(currentPage + 1, totalPages)}`}
            aria-disabled={currentPage >= totalPages}
            className={`px-3 py-1.5 rounded-lg border font-medium transition-colors ${
              currentPage >= totalPages
                ? "pointer-events-none opacity-40 border-zinc-200 text-zinc-400"
                : "border-zinc-200 text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            Próxima
          </Link>
        </div>
      )}
    </div>
  );
}
