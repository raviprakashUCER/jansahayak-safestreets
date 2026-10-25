"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SiteNav, SiteFooter } from "@/components/sections";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Check,
  Trash2,
  Mail,
  Smartphone,
  ExternalLink,
  Info,
} from "lucide-react";

interface NotificationItem {
  id: string;
  userId: string;
  incidentId: string | null;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<"all" | "unread" | "escalation" | "update">("all");
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn("Failed to fetch notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (id?: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { notificationId: id } : { markAll: true }),
      });
      if (id) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      } else {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn("Failed to update notification state:", err);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filterType === "unread") return !n.isRead;
    if (filterType === "escalation") return n.type.includes("escalation") || n.type.includes("deadline");
    if (filterType === "update") return n.type.includes("status") || n.type.includes("verified");
    return true;
  });

  return (
    <>
      <div className="box-grid">
        <SiteNav />
        <main className="min-h-screen">
          <section className="section-box categories-section">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="section-label">Citizen Noticeboard</p>
                <div className="section-heading">
                  <h1 className="font-heading text-2xl font-bold text-[#0e2b24] dark:text-[#f5f3ed] sm:text-3xl">
                    Notifications & Follow-up History
                  </h1>
                </div>
                <p className="mt-1 text-sm text-[#486057] dark:text-[#cbd5cb] max-w-2xl">
                  Track status milestones, automated SLA follow-ups, and community verifications on your submitted cases.
                </p>
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => markAsRead()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-card border border-border text-xs font-semibold text-foreground hover:bg-muted transition-all cursor-pointer"
                >
                  <Check className="size-3.5" />
                  <span>Mark All as Read ({unreadCount})</span>
                </button>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Notification Stream */}
              <div className="lg:col-span-2 space-y-4">
                {/* Filter chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar text-xs">
                  <button
                    type="button"
                    onClick={() => setFilterType("all")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      filterType === "all"
                        ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] font-semibold"
                        : "bg-card border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    All ({notifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("unread")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      filterType === "unread"
                        ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] font-semibold"
                        : "bg-card border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Unread ({unreadCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("escalation")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      filterType === "escalation"
                        ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] font-semibold"
                        : "bg-card border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Escalations & Deadlines
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterType("update")}
                    className={`px-3 py-1.5 rounded-full font-medium transition-all ${
                      filterType === "update"
                        ? "bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] font-semibold"
                        : "bg-card border border-border text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Status Updates
                  </button>
                </div>

                {loading ? (
                  <div className="p-8 text-center text-xs text-muted-foreground">Loading notifications...</div>
                ) : filtered.length === 0 ? (
                  <div className="p-8 rounded-3xl bg-card border border-border text-center">
                    <Bell className="size-8 mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm font-semibold text-foreground">No notifications in this view</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      When you submit reports or cases reach SLA deadlines, updates will be recorded here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {filtered.map((item) => {
                      const isEscalation = item.type.includes("escalation") || item.type.includes("deadline");
                      return (
                        <div
                          key={item.id}
                          className={`p-4 rounded-2xl bg-card border transition-all flex items-start justify-between gap-3 shadow-xs ${
                            item.isRead ? "border-border opacity-85" : "border-primary/40 bg-primary/5"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span
                              className={`size-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isEscalation
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
                                  : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                              }`}
                            >
                              {isEscalation ? (
                                <AlertTriangle className="size-4" />
                              ) : (
                                <CheckCircle2 className="size-4" />
                              )}
                            </span>

                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-xs text-foreground">{item.title}</h3>
                                {!item.isRead && (
                                  <span className="size-2 rounded-full bg-primary" />
                                )}
                              </div>
                              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                {item.message}
                              </p>
                              <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                                <span>{new Date(item.createdAt).toLocaleString()}</span>
                                {item.incidentId && (
                                  <Link
                                    href={`/reports/${item.incidentId}`}
                                    className="font-semibold text-primary hover:underline inline-flex items-center gap-1"
                                  >
                                    <span>Inspect Case #{item.incidentId.slice(0, 8)}</span>
                                    <ExternalLink className="size-3" />
                                  </Link>
                                )}
                              </div>
                            </div>
                          </div>

                          {!item.isRead && (
                            <button
                              type="button"
                              onClick={() => markAsRead(item.id)}
                              title="Mark as read"
                              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground shrink-0"
                            >
                              <Check className="size-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Preferences & Report History Sidebar */}
              <div className="space-y-4">
                {/* Quick link to user reports */}
                <div className="p-5 rounded-3xl bg-card border border-border shadow-xs">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Citizen Activity
                  </div>
                  <h3 className="font-heading text-base font-bold text-foreground mt-0.5">
                    Your Report History
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Inspect all road safety reports and evidence submitted from your device.
                  </p>
                  <Link
                    href="/reports"
                    className="mt-3.5 w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#0e2b24] text-white dark:bg-[#78a37d] dark:text-[#0e2b24] text-xs font-semibold hover:opacity-90 transition-all"
                  >
                    <span>Browse Public Case Directory</span>
                  </Link>
                </div>

                {/* Delivery Preferences */}
                <div className="p-5 rounded-3xl bg-card border border-border shadow-xs space-y-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Notification Preferences
                  </div>
                  <h3 className="font-heading text-sm font-bold text-foreground">
                    Alert Delivery Channels
                  </h3>

                  <div className="space-y-2 text-xs">
                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Mail className="size-3.5 text-muted-foreground" />
                        <div>
                          <div className="font-semibold text-foreground">Email Status Digests</div>
                          <div className="text-[10px] text-muted-foreground">Weekly resolution milestones</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailAlerts}
                        onChange={(e) => setEmailAlerts(e.target.checked)}
                        className="size-4 accent-[#0e2b24]"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-3.5 text-muted-foreground" />
                        <div>
                          <div className="font-semibold text-foreground">SMS Escalation Alerts</div>
                          <div className="text-[10px] text-muted-foreground">Requires Twilio/Gov SMS gateway</div>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={smsAlerts}
                        onChange={(e) => setSmsAlerts(e.target.checked)}
                        className="size-4 accent-[#0e2b24]"
                      />
                    </label>
                  </div>

                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    * SMS dispatch is only active when a valid provider credential is configured in server environment
                    variables. When unavailable, internal in-app noticeboard is always used.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    </>
  );
}
