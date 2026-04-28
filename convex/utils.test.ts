import { describe, expect, it } from "vitest";
import { type DuplicateResult, findDuplicatesInRecords } from "./utils";

describe("findDuplicatesInRecords", () => {
  it("should return empty result for empty array", () => {
    const result = findDuplicatesInRecords([]);
    expect(result).toEqual({ duplicateEmails: [], duplicateNames: [] });
  });

  it("should return empty result for single record", () => {
    const records = [
      {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result).toEqual({ duplicateEmails: [], duplicateNames: [] });
  });

  it("should detect duplicate emails", () => {
    const records = [
      {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        email: "johN@example.com",
      },
      {
        id: "2",
        firstName: "Jane",
        lastName: "Doe",
        email: "john@example.com",
      },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result.duplicateEmails).toContain("john@example.com");
    expect(result.duplicateNames).toEqual([]);
  });

  it("should detect duplicate names (case insensitive)", () => {
    const records = [
      {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
      {
        id: "2",
        firstName: "JOHN",
        lastName: "DOE",
        email: "john2@example.com",
      },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result.duplicateNames).toHaveLength(1);
    expect(result.duplicateNames[0]).toEqual({
      firstName: "JOHN",
      lastName: "DOE",
      id: "2",
    });
  });

  it("should detect both duplicate emails and names", () => {
    const records = [
      {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
      {
        id: "2",
        firstName: "Jane",
        lastName: "Doe",
        email: "john@example.com",
      },
      {
        id: "3",
        firstName: "John",
        lastName: "Doe",
        email: "john3@example.com",
      },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result.duplicateEmails).toContain("john@example.com");
    expect(result.duplicateNames).toHaveLength(1);
  });

  it("should handle records with missing email", () => {
    const records = [
      { id: "1", firstName: "John", lastName: "Doe", email: undefined },
      {
        id: "2",
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
      },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result.duplicateEmails).toEqual([]);
  });

  it("should handle records with missing names", () => {
    const records = [
      {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
      {
        id: "2",
        firstName: undefined,
        lastName: "Doe",
        email: "jane@example.com",
      },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result.duplicateNames).toEqual([]);
  });

  it("should handle records with partial names", () => {
    const records = [
      {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
      {
        id: "2",
        firstName: "John",
        lastName: undefined,
        email: "john2@example.com",
      },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result.duplicateNames).toEqual([]);
  });

  it("should detect multiple duplicate emails", () => {
    const records = [
      { id: "1", firstName: "A", lastName: "A", email: "a@example.com" },
      { id: "2", firstName: "B", lastName: "B", email: "a@example.com" },
      { id: "3", firstName: "C", lastName: "C", email: "b@example.com" },
      { id: "4", firstName: "D", lastName: "D", email: "b@example.com" },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result.duplicateEmails).toHaveLength(2);
    expect(result.duplicateEmails).toContain("a@example.com");
    expect(result.duplicateEmails).toContain("b@example.com");
  });

  it("should handle records without id field for names", () => {
    const records = [
      {
        id: "1",
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
      { firstName: "John", lastName: "Doe", email: "john2@example.com" },
    ];
    const result = findDuplicatesInRecords(records);
    expect(result.duplicateNames).toEqual([]);
  });
});
