import { NextRequest, NextResponse } from "next/server";
import { ComplaintAssistantSchema } from "@/lib/validations/incident-schemas";
import { assistComplaintDrafting } from "@/lib/ai/complaint-assistant";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client_ip";
    const rateCheck = checkRateLimit(`ai_assistant:${ip}`, { intervalMs: 60_000, maxTokens: 20 });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded. Please wait a moment before requesting further AI suggestions.",
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = ComplaintAssistantSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const suggestion = await assistComplaintDrafting(parsed.data);

    return NextResponse.json({
      success: true,
      suggestion,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
