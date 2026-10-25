import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserSession } from "@/lib/auth/session";
import { db, notifications } from "@/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  try {
    const session = await getCurrentUserSession();
    const effectiveUserId = session.userId || "citizen_dev";

    const rows = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, effectiveUserId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    const unreadCount = rows.filter((n) => !n.isRead).length;

    return NextResponse.json({
      success: true,
      unreadCount,
      notifications: rows,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getCurrentUserSession();
    const effectiveUserId = session.userId || "citizen_dev";

    const body = await req.json();
    const { notificationId, markAll } = body;

    if (markAll) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, effectiveUserId));
    } else if (notificationId) {
      await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.id, notificationId));
    }

    return NextResponse.json({ success: true, message: "Notifications updated." });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
