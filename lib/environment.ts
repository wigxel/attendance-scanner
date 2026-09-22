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
export const saturationVaporPressure = (temp: number): number => {
  return 6.112 * Math.exp((magnusA * temp) / (magnusB + temp));
};

export const vaporPressure = (temp: number, humidity: number): number => {
  return saturationVaporPressure(temp) * (humidity / 100);
};

export const dewPoint = (temp: number, humidity: number): number => {
  const rh = Math.max(0.01, Math.min(100, humidity)) / 100;
  const alpha = Math.log(rh) + (magnusA * temp) / (magnusB + temp);
  return (magnusB * alpha) / (magnusA - alpha);
};

/* g/m³ — 2.1674 is water vapor constant */
export const absoluteHumidity = (temp: number, humidity: number): number => {
  return (
    (6.112 *
      Math.exp((magnusA * temp) / (magnusB + temp)) *
      humidity *
      2.1674) /
    (273.15 + temp)
  );
};

export const dewPointDepression = (temp: number, td: number): number => {
  return temp - td;
};

export const comfortZone = (temp: number, humidity: number): ComfortResult => {
  const tempGood = temp >= 22 && temp <= 26;
  const tempWarn = temp >= 20 && temp <= 28;
  const rhGood = humidity >= 30 && humidity <= 60;
  const rhWarn = humidity >= 25 && humidity <= 65;

  if (tempGood && rhGood)
    return { status: "good", reason: "inside ASHRAE comfort envelope" };

  if (tempWarn && rhWarn)
    return { status: "warning", reason: "near edge of comfort envelope" };

  if (!tempWarn)
    return { status: "bad", reason: temp < 20 ? "too cold" : "too hot" };

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
