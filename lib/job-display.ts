import type { Job } from "./types";

export function matchTone(category?: string) {
  switch (category) {
    case "Excellent Match":
      return "bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-400";
    case "Good Match":
      return "bg-sky-500/10 text-sky-700 ring-sky-500/20 dark:text-sky-400";
    case "Potential Match":
      return "bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-400";
    default:
      return "bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:text-zinc-400";
  }
}

function formatMoney(value: number, currency?: string) {
  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(value);
    } catch {
      // Fall through to a plain number when the currency code is invalid.
    }
  }

  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(value)}${currency ? ` ${currency}` : ""}`;
}

export function formatSalary(
  job: Pick<Job, "salaryMin" | "salaryMax" | "salaryCurrency" | "salaryPeriod">,
) {
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = job;

  if (!salaryMin && !salaryMax) return null;

  const range =
    salaryMin && salaryMax
      ? `${formatMoney(salaryMin, salaryCurrency)} – ${formatMoney(
          salaryMax,
          salaryCurrency,
        )}`
      : salaryMin
        ? `From ${formatMoney(salaryMin, salaryCurrency)}`
        : `Up to ${formatMoney(salaryMax as number, salaryCurrency)}`;

  return salaryPeriod ? `${range} / ${salaryPeriod}` : range;
}

export function formatJobDate(value?: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function truncateDescription(text: string, maxLength = 360) {
  if (!text) return "";

  if (text.length <= maxLength) return text;

  return `${text.slice(0, maxLength).trimEnd()}…`;
}
