export const colors = {
  paper: "#f5f7f6",
  paper2: "#ffffff",
  wash: "#e8efec",
  ink: "#1a2421",
  muted: "#5c6b66",
  line: "rgba(26, 36, 33, 0.08)",
  lineStrong: "rgba(26, 36, 33, 0.14)",
  sage: "#2a6b5e",
  sage2: "#3d8576",
  low: "#2f7d5b",
  mid: "#b8860b",
  high: "#c45c4a",
  white: "#ffffff",
};

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 32,
};

/** Loaded in app/_layout.tsx via expo-font. */
export const fonts = {
  serif: "Fraunces_400Regular",
  serifItalic: "Fraunces_400Regular_Italic",
  serifSemi: "Fraunces_600SemiBold",
  sans: "InstrumentSans_400Regular",
  sansMed: "InstrumentSans_500Medium",
  sansSemi: "InstrumentSans_600SemiBold",
};

export const radius = {
  plate: 16,
  tight: 12,
};

export function gradeColor(grade?: string | null): string {
  if (grade === "Low") return colors.low;
  if (grade === "Medium") return colors.mid;
  if (grade === "High") return colors.high;
  return colors.ink;
}
