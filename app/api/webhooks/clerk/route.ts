import { NextRequest, NextResponse } from "next/server";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";

interface ClerkWebhookEvent {
  type: string;
  data: {
    id: string;
    email_addresses?: Array<{ email_address: string; id: string }>;
    first_name?: string;
    last_name?: string;
    image_url?: string;
    public_metadata?: {
      role?: string;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as ClerkWebhookEvent;
    const { type, data } = payload;

    if (!data?.id) {
      return NextResponse.json({ error: "Missing Clerk user ID in event data" }, { status: 400 });
    }

    const email = data.email_addresses?.[0]?.email_address || `${data.id}@clerk.user`;
    const fullName = `${data.first_name || ""} ${data.last_name || ""}`.trim() || undefined;
    const role = data.public_metadata?.role || "citizen";
    const avatarUrl = data.image_url || undefined;

    switch (type) {
      case "user.created":
      case "user.updated": {
        await db
          .insert(users)
          .values({
            id: data.id,
            email,
            fullName,
            role,
            avatarUrl,
            metadata: data.public_metadata || {},
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              email,
              fullName,
              role,
              avatarUrl,
              metadata: data.public_metadata || {},
              updatedAt: new Date(),
            },
          });
        return NextResponse.json({ success: true, message: `User ${data.id} synced to Postgres` });
      }

      case "user.deleted": {
        await db.delete(users).where(eq(users.id, data.id));
        return NextResponse.json({
          success: true,
          message: `User ${data.id} removed from Postgres`,
        });
      }

      default:
        return NextResponse.json({ received: true, ignored: true });
    }
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    console.error("Clerk Webhook processing error:", err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
