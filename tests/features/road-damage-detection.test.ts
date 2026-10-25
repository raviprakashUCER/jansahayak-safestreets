import { describe, it, expect } from "vitest";
import {
  verifyImageMagicBytes,
  analyzeRoadDamagePhoto,
} from "@/lib/ai/road-damage-detection";

describe("Road Damage Computer Vision & Binary Validation", () => {
  it("should validate authentic JPEG magic bytes correctly", () => {
    // JPEG header: FF D8 FF E0
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
    const isValid = verifyImageMagicBytes(jpegBuffer, "image/jpeg");
    expect(isValid).toBe(true);
  });

  it("should validate authentic PNG magic bytes correctly", () => {
    // PNG header: 89 50 4E 47 0D 0A 1A 0A
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
    const isValid = verifyImageMagicBytes(pngBuffer, "image/png");
    expect(isValid).toBe(true);
  });

  it("should reject corrupted or spoofed image files", () => {
    // Disguised text file
    const fakeBuffer = Buffer.from("<html><script>alert(1)</script></html>");
    const isJpeg = verifyImageMagicBytes(fakeBuffer, "image/jpeg");
    const isPng = verifyImageMagicBytes(fakeBuffer, "image/png");

    expect(isJpeg).toBe(false);
    expect(isPng).toBe(false);
  });

  it("should enforce maximum 10MB payload size restriction", async () => {
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024); // 11MB
    await expect(
      analyzeRoadDamagePhoto({
        imageBuffer: oversizedBuffer,
        filename: "huge.jpg",
        contentType: "image/jpeg",
      })
    ).rejects.toThrow(/exceeds maximum allowed limit/i);
  });

  it("should return structured detection results with confidence and bounding boxes", async () => {
    // Valid JPEG mock header
    const validJpeg = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);

    const result = await analyzeRoadDamagePhoto({
      imageBuffer: validJpeg,
      filename: "road_defect_pari_chowk.jpg",
      contentType: "image/jpeg",
    });

    expect(result).toBeDefined();
    expect(result.detectedHazards.length).toBeGreaterThan(0);
    expect(result.primaryCategory).toBeDefined();
    expect(result.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(1);

    const firstHazard = result.detectedHazards[0]!;
    expect(firstHazard.category).toBeDefined();
    expect(firstHazard.confidence).toBeGreaterThan(0);
    expect(firstHazard.boundingBox).toBeDefined();
    expect(firstHazard.boundingBox.ymin).toBeGreaterThanOrEqual(0);
    expect(firstHazard.boundingBox.ymax).toBeLessThanOrEqual(1);
    expect(firstHazard.boundingBox.xmin).toBeGreaterThanOrEqual(0);
    expect(firstHazard.boundingBox.xmax).toBeLessThanOrEqual(1);
  });
});
