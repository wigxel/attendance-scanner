import { describe, expect, it } from "vitest";
import {
  absoluteHumidity,
  comfortZone,
  condensationRisk,
  dewPoint,
  dewPointDepression,
  dryAirRisk,
  moldRisk,
  saturationVaporPressure,
  vaporPressure,
} from "./environment";

describe("dewPoint", () => {
  it("25°C 50% ≈ 13.9°C (Magnus)", () => {
    expect(dewPoint(25, 50)).toBeCloseTo(13.9, 0);
  });
  it("0°C 100% dew point is 0°C", () => {
    expect(dewPoint(0, 100)).toBeCloseTo(0, 0);
  });
  it("30°C 70% high humidity", () => {
    expect(dewPoint(30, 70)).toBeCloseTo(23.9, 0);
  });
  it("clamps humidity to avoid log(0)", () => {
    expect(dewPoint(20, 0)).toBeDefined();
  });
});

describe("saturationVaporPressure / vaporPressure", () => {
  it("saturation increases with temp", () => {
    expect(saturationVaporPressure(30)).toBeGreaterThan(
      saturationVaporPressure(20),
    );
  });
  it("vaporPressure scales with humidity", () => {
    expect(vaporPressure(20, 50)).toBeCloseTo(
      saturationVaporPressure(20) * 0.5,
      1,
    );
  });
});

describe("absoluteHumidity", () => {
  it("returns g/m³ positive", () => {
    expect(absoluteHumidity(21, 50)).toBeCloseTo(9.1, 0);
  });
  it("increases with humidity at same temp", () => {
    expect(absoluteHumidity(20, 80)).toBeGreaterThan(absoluteHumidity(20, 40));
  });
});

describe("dewPointDepression", () => {
  it("T - Td", () => {
    expect(dewPointDepression(25, 13.9)).toBeCloseTo(11.1, 1);
  });
});

describe("comfortZone", () => {
  it("22°C 45% is good", () => {
    expect(comfortZone(22, 45).status).toBe("good");
  });
  it("26°C 60% is good (upper edge)", () => {
    expect(comfortZone(26, 60).status).toBe("good");
  });
  it("20°C 45% is warning (edge)", () => {
    expect(comfortZone(20, 45).status).toBe("warning");
  });
  it("15°C is bad cold", () => {
    expect(comfortZone(15, 45).status).toBe("bad");
  });
  it("30°C is bad hot", () => {
    expect(comfortZone(30, 45).status).toBe("bad");
  });
  it("20% RH is bad dry", () => {
    expect(comfortZone(22, 20).status).toBe("bad");
  });
  it("70% RH is bad humid", () => {
    expect(comfortZone(22, 70).status).toBe("bad");
  });
});

describe("moldRisk", () => {
  it("humidity >60 at-risk", () => {
    expect(moldRisk(65, 5)).toBe("at-risk");
  });
  it("depression <3 at-risk even with low RH", () => {
    expect(moldRisk(50, 2)).toBe("at-risk");
  });
  it("ok when dry and far from dew point", () => {
    expect(moldRisk(45, 8)).toBe("ok");
  });
});

describe("dryAirRisk", () => {
  it("29% at-risk", () => {
    expect(dryAirRisk(29)).toBe("at-risk");
  });
  it("30% ok", () => {
    expect(dryAirRisk(30)).toBe("ok");
  });
});

describe("condensationRisk", () => {
  it("depression <2 high", () => {
    expect(condensationRisk(1.5)).toBe("high");
  });
  it("depression 2 ok", () => {
    expect(condensationRisk(2)).toBe("ok");
  });
});
