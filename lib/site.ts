export const siteConfig = {
  name: "JanSahayak",
  productName: "JanSahayak SafeStreets",
  description:
    "Document road-safety hazards, discover existing reports, and follow recorded civic updates in Greater Noida.",
  pilotArea: "Greater Noida, Uttar Pradesh",
  navigation: [
    { label: "Dashboard", href: "/dashboard" },
    { label: "Accountability", href: "/accountability" },
    { label: "Explore map", href: "/map" },
    { label: "Route Advisory", href: "/nearby" },
    { label: "Area Health", href: "/area-health" },
    { label: "Notifications", href: "/notifications" },
    { label: "How it works", href: "/#how-it-works" },
  ],
  languages: [
    {
      code: "en",
      label: "English",
      native: "English",
      glyph: "A",
      script: "Latin",
      note: "Primary",
    },
    {
      code: "hi",
      label: "Hindi",
      native: "हिन्दी",
      glyph: "अ",
      script: "Devanagari",
      note: "मुख्य भाषा",
    },
    {
      code: "ur",
      label: "Urdu",
      native: "اردو",
      glyph: "ع",
      script: "Nastaliq",
      note: "علاقائی",
      dir: "rtl" as const,
    },
    { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", glyph: "ਅ", script: "Gurmukhi", note: "ਖੇਤਰੀ" },
  ],
} as const;

export const hazardCategories = [
  { label: "Broken footpaths", context: "Walkability", icon: "path", tone: "coral" },
  { label: "Unsafe crossings", context: "Pedestrian safety", icon: "crossing", tone: "amber" },
  { label: "Poorly lit streets", context: "Visibility", icon: "light", tone: "sage" },
] as const;

export type HazardCategory = (typeof hazardCategories)[number];
export type HazardIconName = HazardCategory["icon"];
export type HazardTone = HazardCategory["tone"];
export type LanguageConfig = (typeof siteConfig.languages)[number];
