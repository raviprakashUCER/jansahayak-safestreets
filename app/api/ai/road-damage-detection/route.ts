import { NextRequest, NextResponse } from "next/server";
import { detectRoadDamageInImage, validateImageMagicBytes } from "@/lib/ai/road-damage-detection";
import { checkRateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") || "client_ip";
    const rateCheck = checkRateLimit(`damage_vision:${ip}`, { intervalMs: 60_000, maxTokens: 15 });

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many image analysis requests. Please wait a moment." },
        { status: 429 }
      );
    }

    let buffer: Buffer | null = null;
    let categoryHint = "Road Surface / Pothole";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("image") as File | null;
      const hint = formData.get("categoryHint") as string | null;
      if (hint) categoryHint = hint;

      if (!file) {
        return NextResponse.json({ error: "Missing image file in form data" }, { status: 400 });
      }

      const arrayBuf = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuf);
    } else {
      const json = await req.json();
      if (json.categoryHint) categoryHint = json.categoryHint;
      if (json.base64) {
        const cleanBase64 = json.base64.replace(/^data:image\/\w+;base64,/, "");
        buffer = Buffer.from(cleanBase64, "base64");
      }
    }

    if (!buffer || buffer.length === 0) {
      return NextResponse.json(
        { error: "No valid image data received for analysis." },
        { status: 400 }
      );
    }

    const validation = validateImageMagicBytes(buffer);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid image bytes." },
        { status: 400 }
      );
    }

    const result = await detectRoadDamageInImage(buffer, categoryHint);

    return NextResponse.json({
      success: true,
      detection: result,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
