export const palette = ["#0102FC", "#0254FE", "#02C7FE", "#FD9704", "#FD3001"] as const;

export const getBucketIndex = (temperature: number): number => {
  if (temperature < 22) return 0;
  if (temperature < 26) return 1;
  if (temperature < 30) return 2;
  if (temperature < 33) return 3;
  return 4;
};

export const getColor = (temperature: number | null): string => {
  if (temperature === null) return "var(--background)";
  return palette[getBucketIndex(temperature)];
};

export const getFallbackColor = (temperature: number | null): string => getColor(temperature);

export const getColors = (): readonly string[] => palette;
