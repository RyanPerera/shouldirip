export const displayPercent = (percent: number) =>
  `${(percent * 100).toFixed(2)}%`;

export type Currency = "USD" | "CAD";

export const FALLBACK_USD_TO_CAD = 1.35;

export const convertFromUsd = (
  amountUsd: number,
  currency: Currency,
  usdToCadRate: number,
) => {
  if (currency === "CAD") return amountUsd * usdToCadRate;
  return amountUsd;
};

export const convertToUsd = (
  amount: number,
  currency: Currency,
  usdToCadRate: number,
) => {
  if (currency === "CAD") return amount / usdToCadRate;
  return amount;
};

export const formatCurrencyFromUsd = (
  amountUsd: number,
  currency: Currency,
  usdToCadRate: number,
) => {
  const convertedAmount = convertFromUsd(amountUsd, currency, usdToCadRate);
  const formatted = new Intl.NumberFormat("en-CA", {
    style: "decimal",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(convertedAmount));

  return convertedAmount < 0 ? `-$${formatted}` : `$${formatted}`;
};
