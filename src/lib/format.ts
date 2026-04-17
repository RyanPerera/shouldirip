export const displayPercent = (percent: number) =>
  `${(percent * 100).toFixed(2)}%`;

export type Currency = "USD" | "CAD" | "JPY";

export const FALLBACK_USD_TO_CAD = 1.35;
export const FALLBACK_USD_TO_JPY = 150;

type ExchangeRates = {
  usdToCadRate: number;
  usdToJpyRate: number;
};

export const convertFromUsd = (
  amountUsd: number,
  currency: Currency,
  rates: ExchangeRates,
) => {
  if (currency === "CAD") return amountUsd * rates.usdToCadRate;
  if (currency === "JPY") return amountUsd * rates.usdToJpyRate;
  return amountUsd;
};

export const convertToUsd = (
  amount: number,
  currency: Currency,
  rates: ExchangeRates,
) => {
  if (currency === "CAD") return amount / rates.usdToCadRate;
  if (currency === "JPY") return amount / rates.usdToJpyRate;
  return amount;
};

export const formatCurrencyFromUsd = (
  amountUsd: number,
  currency: Currency,
  rates: ExchangeRates,
) => {
  const convertedAmount = convertFromUsd(amountUsd, currency, rates);
  const symbol = currency === "JPY" ? "¥" : "$";
  const locale = currency === "JPY" ? "ja-JP" : "en-CA";
  const fractionDigits = currency === "JPY" ? 0 : 2;

  const formatted = new Intl.NumberFormat(locale, {
    style: "decimal",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Math.abs(convertedAmount));

  return convertedAmount < 0 ? `-${symbol}${formatted}` : `${symbol}${formatted}`;
};
