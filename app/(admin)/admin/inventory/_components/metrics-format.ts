import { currencyFormatter } from "@/lib/currency.helpers";

const amountFormatter = new Intl.NumberFormat("en-NG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatKobo(value: number) {
  return currencyFormatter.format(value / 100);
}

export function formatAmount(value: number) {
  return amountFormatter.format(value / 100);
}
