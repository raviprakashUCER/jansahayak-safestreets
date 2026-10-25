import { describe, it, expect } from "vitest";
import { generateComplaintSuggestions } from "@/lib/ai/complaint-assistant";

describe("AI Smart Complaint Assistant & Rule-Based Fallback", () => {
  it("should categorize Hindi pothole complaint correctly", async () => {
    const input = "सड़क पर बहुत बड़ा गड्ढा है और गाड़ियां टकरा रही हैं परी चौक के पास";
    const result = await generateComplaintSuggestions(input, "hi");

    expect(result).toBeDefined();
    expect(result.suggestedCategory).toBe("road-surface");
    expect(result.structuredTitle).toMatch(/Road Surface|Pothole/);
    expect(result.suggestedDepartment).toBe("GNIDA Civil Maintenance Division");
    expect(result.suggestedPriority).toMatch(/high|critical/);
    expect(result.evidenceSuggestions.length).toBeGreaterThan(0);
    expect(result.improvedDescription.length).toBeGreaterThan(15);
  });

  it("should categorize Hindi streetlight complaint correctly", async () => {
    const input = "रात को इस रास्ते पर स्ट्रीट लाइट बिल्कुल बंद रहती है अंधेरा रहता है";
    const result = await generateComplaintSuggestions(input, "hi");

    expect(result.suggestedCategory).toBe("lighting");
    expect(result.suggestedDepartment).toBe("GNIDA Electrical & Street Lighting Wing");
    expect(result.evidenceSuggestions.some((e) => e.toLowerCase().includes("lighting") || e.toLowerCase().includes("dark") || e.toLowerCase().includes("night"))).toBe(true);
  });

  it("should categorize English drainage and waterlogging complaint correctly", async () => {
    const input = "Severe waterlogging and overflowing open drain near Delta 1 sector road";
    const result = await generateComplaintSuggestions(input, "en");

    expect(result.suggestedCategory).toBe("drainage");
    expect(result.suggestedDepartment).toBe("Greater Noida Municipality Drainage Cell");
    expect(result.suggestedPriority).toMatch(/medium|high|critical/);
    expect(result.structuredTitle).toContain("Drainage");
  });

  it("should categorize Hinglish crossing and pedestrian safety complaint correctly", async () => {
    const input = "Zebra crossing faded hai aur pedestrian signal nahi chal raha crossing karna dangerous hai";
    const result = await generateComplaintSuggestions(input, "en");

    expect(result.suggestedCategory).toBe("crossing");
    expect(result.suggestedDepartment).toBe("Noida-Greater Noida Traffic Police");
  });

  it("should categorize broken footpath complaint correctly", async () => {
    const input = "Broken pedestrian walkway and missing paver tiles forcing citizens onto active carriageway";
    const result = await generateComplaintSuggestions(input, "en");

    expect(result.suggestedCategory).toBe("footpath");
    expect(result.suggestedDepartment).toBe("GNIDA Civil Maintenance Division");
  });

  it("should provide fallback suggestions even for generic vague inputs", async () => {
    const input = "Civic defect observed near the main market";
    const result = await generateComplaintSuggestions(input);

    expect(result).toBeDefined();
    expect(result.suggestedCategory).toBeDefined();
    expect(result.structuredTitle.length).toBeGreaterThan(5);
    expect(result.evidenceSuggestions.length).toBeGreaterThan(0);
  });
});
