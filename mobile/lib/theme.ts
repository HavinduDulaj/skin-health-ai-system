export const colors = {
  paper: "#efe8dc",
  paper2: "#f7f2e9",
  wash: "#e4d6c4",
  ink: "#1c1814",
  muted: "#5e564d",
  line: "rgba(28, 24, 20, 0.12)",
  lineStrong: "rgba(28, 24, 20, 0.22)",
  sage: "#2f4a3e",
  sage2: "#4a6b5a",
  low: "#3e6b4f",
  mid: "#b07a2b",
  high: "#9b4030",
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
  plate: 4,
  tight: 3,
};

export function gradeColor(grade?: string | null): string {
  if (grade === "Low") return colors.low;
  if (grade === "Medium") return colors.mid;
  if (grade === "High") return colors.high;
  return colors.ink;
}
