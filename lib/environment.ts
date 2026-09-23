// Business logic for T/H/P derived insights — functional, no Effect, no imperative loops.
// ponytail: pressure stored for future draft/weather, no derived insight in v1

export type ComfortStatus = "good" | "warning" | "bad";

export type ComfortResult = {
  readonly status: ComfortStatus;
  readonly reason: string;
};

export type MoldRisk = "ok" | "at-risk";
export type DryRisk = "ok" | "at-risk";
export type CondensationRisk = "ok" | "high";

const magnusA = 17.67;
const magnusB = 243.5;

// pure math — Magnus formula (TI SNAA368)
export const saturationVaporPressure = (temperature: number): number => {
  return 6.112 * Math.exp((magnusA * temperature) / (magnusB + temperature));
};

export const vaporPressure = (temperature: number, humidity: number): number => {
  return saturationVaporPressure(temperature) * (humidity / 100);
};

export const dewPoint = (temperature: number, humidity: number): number => {
  const relativeHumidity = Math.max(0.01, Math.min(100, humidity)) / 100;
  const alpha = Math.log(relativeHumidity) + (magnusA * temperature) / (magnusB + temperature);
  return (magnusB * alpha) / (magnusA - alpha);
};

/* g/m³ — 2.1674 is water vapor constant */
export const absoluteHumidity = (temperature: number, humidity: number): number => {
  return (
    (6.112 *
      Math.exp((magnusA * temperature) / (magnusB + temperature)) *
      humidity *
      2.1674) /
    (273.15 + temperature)
  );
};

export const dewPointDepression = (temperature: number, dewPointTemperature: number): number => {
  return temperature - dewPointTemperature;
};

export const comfortZone = (temperature: number, humidity: number): ComfortResult => {
  const temperatureGood = temperature >= 22 && temperature <= 26;
  const temperatureWarning = temperature >= 20 && temperature <= 28;
  const humidityGood = humidity >= 30 && humidity <= 60;
  const humidityWarning = humidity >= 25 && humidity <= 65;

  if (temperatureGood && humidityGood)
    return { status: "good", reason: "inside ASHRAE comfort envelope" };

  if (temperatureWarning && humidityWarning)
    return { status: "warning", reason: "near edge of comfort envelope" };

  if (!temperatureWarning)
    return { status: "bad", reason: temperature < 20 ? "too cold" : "too hot" };

  return { status: "bad", reason: humidity < 25 ? "too dry" : "too humid" };
};

export const moldRisk = (humidity: number, depression: number): MoldRisk => {
  return humidity > 60 || depression < 3 ? "at-risk" : "ok";
};

export const dryAirRisk = (humidity: number): DryRisk => {
  return humidity < 30 ? "at-risk" : "ok";
};

export const condensationRisk = (depression: number): CondensationRisk => {
  return depression < 2 ? "high" : "ok";
};
