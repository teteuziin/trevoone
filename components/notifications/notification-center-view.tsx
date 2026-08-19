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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";

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
  const [filterTab, setFilterTab] = useState<"all" | "unread">("all");

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

  const displayedNotifications = filterTab === "unread"
    ? notifications.filter((n) => !n.readAt)
    : notifications;

  return (
    <div className="space-y-6">
      {/* Push Device Configuration Card */}
      <Card padding="md" className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[var(--text-primary)]">
              Notificações do Dispositivo
            </span>
            {pushSupported && isPushSubscribed && (
              <Badge variant="brand" size="sm" dot>
                Ativo
              </Badge>
            )}
          </div>
          <p className="text-xs text-[var(--text-secondary)] leading-relaxed max-w-xl">
            Receba avisos imediatos de treinos, dietas, pagamentos e comunicados diretamente neste aparelho.
          </p>
          {pushFeedback && (
            <p
              className={`text-xs font-semibold pt-1 ${
                pushFeedback.type === "success" ? "text-[var(--brand-foreground)]" : "text-[var(--danger)]"
              }`}
            >
              {pushFeedback.message}
            </p>
          )}
        </div>

        <div className="shrink-0">
          {pushSupported === false ? (
            <span className="text-xs text-[var(--text-tertiary)] font-medium">Não suportado neste navegador</span>
          ) : pushPermission === "denied" ? (
            <span className="text-xs text-[var(--danger)] font-semibold">Bloqueado no navegador</span>
          ) : (
            <Button
              size="sm"
              variant={isPushSubscribed ? "secondary" : "primary"}
              disabled={pushLoading || !vapidPublicKey}
              isLoading={pushLoading}
              onClick={handleTogglePush}
            >
              {isPushSubscribed ? "Desativar neste aparelho" : "Ativar neste aparelho"}
            </Button>
          )}
        </div>
      </Card>

      {/* Control Bar: Tabs & Mark All Read */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <Tabs
          size="sm"
          activeId={filterTab}
          onChange={(id) => setFilterTab(id as "all" | "unread")}
          items={[
            { id: "all", label: "Todas", count: initialTotal },
            { id: "unread", label: "Não lidas", count: unreadCount },
          ]}
        />

        {unreadCount > 0 && (
          <button
            type="button"
            disabled={isPending}
            onClick={handleMarkAllRead}
            className="text-xs font-semibold text-[var(--brand-strong)] hover:text-[var(--brand)] hover:underline cursor-pointer disabled:opacity-50 transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)] rounded-md"
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {displayedNotifications.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-5 h-5 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            }
            title={filterTab === "unread" ? "Nenhuma notificação não lida" : "Nenhuma notificação"}
            description={
              filterTab === "unread"
                ? "Você leu todos os avisos recentes."
                : "Quando houver novidades sobre seus treinos, planos ou consultorias, elas aparecerão aqui."
            }
          />
        ) : (
          displayedNotifications.map((notif) => {
            const isUnread = !notif.readAt;

            return (
              <Card
                key={notif.publicId}
                padding="md"
                className={`transition-all ${
                  isUnread
                    ? "border-[var(--brand-soft-border)] bg-[var(--brand-soft)]/20"
                    : ""
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      {isUnread && (
                        <span className="w-2 h-2 rounded-full bg-[var(--brand)] shrink-0" aria-label="Não lida" />
                      )}

                      {notif.priority === "CRITICAL" && (
                        <Badge variant="danger" size="sm">
                          Urgente
                        </Badge>
                      )}

                      {notif.priority === "HIGH" && (
                        <Badge variant="warning" size="sm">
                          Importante
                        </Badge>
                      )}

                      {notif.consultancyName && (
                        <Badge variant="neutral" size="sm">
                          {notif.consultancyName}
                        </Badge>
                      )}

                      <span className="text-[11px] text-[var(--text-tertiary)] font-medium">
                        {formatDate(notif.createdAt)}
                      </span>
                    </div>

                    <h4 className={`text-sm font-bold leading-snug ${isUnread ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                      {notif.title}
                    </h4>

                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                      {notif.body}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-0.5">
                    {isUnread && (
                      <button
                        type="button"
                        onClick={() => handleMarkRead(notif.publicId)}
                        title="Marcar como lida"
                        aria-label="Marcar como lida"
                        className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--brand)] rounded-lg hover:bg-[var(--surface-hover)] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                {notif.deepLink && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-subtle)] flex items-center justify-end">
                    <Link
                      href={notif.deepLink}
                      onClick={() => {
                        if (isUnread) handleMarkRead(notif.publicId);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[var(--brand-foreground)] bg-[var(--brand-soft)] hover:bg-[var(--brand-soft-border)]/50 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-[var(--brand)]"
                    >
                      <span>Acessar</span>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                      </svg>
                    </Link>
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border-default)] text-xs">
          <Link
            href={`/notificacoes?pagina=${Math.max(currentPage - 1, 1)}`}
            aria-disabled={currentPage <= 1}
            className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
              currentPage <= 1
                ? "pointer-events-none opacity-40 border-[var(--border-default)] text-[var(--text-tertiary)]"
                : "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Anterior
          </Link>

          <span className="text-[var(--text-secondary)] font-medium">
            Página {currentPage} de {totalPages}
          </span>

          <Link
            href={`/notificacoes?pagina=${Math.min(currentPage + 1, totalPages)}`}
            aria-disabled={currentPage >= totalPages}
            className={`px-3 py-1.5 rounded-xl border font-semibold transition-colors ${
              currentPage >= totalPages
                ? "pointer-events-none opacity-40 border-[var(--border-default)] text-[var(--text-tertiary)]"
                : "border-[var(--border-default)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
            }`}
          >
            Próxima
          </Link>
        </div>
      )}
    </div>
  );
}
