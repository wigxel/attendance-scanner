import { type ClassValue, clsx } from "clsx";
import { addMonths, intervalToDuration } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isSSR(): boolean {
  return typeof window === "undefined";
}

export const calculateEndDate = (
  startDate: Date,
  workingDays: number,
): Date => {
  const in_monthly_range = workingDays >= 25 && workingDays <= 31;

  if (in_monthly_range) {
    return addMonths(startDate, 1);
  }

  const start = new Date(startDate);
  const currentDate = new Date(start);
  let daysAdded = 0;

  // Count the start date if it's not a Sunday
  if (currentDate.getDay() !== 0) {
    daysAdded++;
  }

  while (daysAdded < workingDays) {
    currentDate.setDate(currentDate.getDate() + 1);
    // skip Sundays (0 = Sunday)
    if (currentDate.getDay() !== 0) {
      daysAdded++;
    }
  }

  return currentDate;
};

export const loadPaystackScript = () => {
  return new Promise((resolve, reject) => {
    if (document.getElementById("paystack-js")) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.id = "paystack-js";
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error("Failed to load Paystack script"));
    document.body.appendChild(script);
  });
};

export const formatDateToLocalISO = (date: Date | null): string => {
  if (!date) return "";
  const dateObj = new Date(date);
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0"); // Months are 0-indexed
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const formatTime = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export function formatCompact(start: Date, end: Date): string {
  const d = intervalToDuration({ start, end });
  const parts: string[] = [];
  if (d.years) parts.push(d.years + "y");
  if (d.months) parts.push(d.months + "mo");
  if (d.days) parts.push(d.days + "d");
  if (d.hours) parts.push(d.hours + "h");
  if (d.minutes) parts.push(d.minutes + "m");
  if (d.seconds || parts.length === 0) parts.push((d.seconds || 0) + "s");
  return parts.join(" ");
}
