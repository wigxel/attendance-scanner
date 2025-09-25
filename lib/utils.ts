import { clsx, type ClassValue } from "clsx";
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
