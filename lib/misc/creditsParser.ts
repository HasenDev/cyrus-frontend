export function parseCredits(
  amount: number | string | undefined | null
): string {
  if (amount === undefined || amount === null) return "0";

  const num =
    typeof amount === "string"
      ? parseFloat(amount.replace(/,/g, "").trim())
      : amount;

  if (isNaN(num) || num === 0) return "0";

  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(num);
}