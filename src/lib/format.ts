export const inr = (n?: number | null): string =>
  n == null ? "—" : `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
