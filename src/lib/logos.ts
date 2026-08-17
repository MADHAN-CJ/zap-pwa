// Company logos via logo.dev's Logo Images API — a plain image URL you can drop
// straight into <img src>. Uses the PUBLISHABLE key (safe client-side); never
// embed the secret key here (that's for logo.dev's server-side Brand Search).
//
// logo.dev resolves by domain, so we map tickers → company domains. Symbols not
// in the map fall back to the monogram tile. Extend the map (or move it to the
// backend alongside the order feed) as more symbols appear.
const PUBLISHABLE_KEY = "pk_An5NVFvfQn2N2vE2FGGLGQ";

const DOMAINS: Record<string, string> = {
  RELIANCE: "ril.com",
  INFY: "infosys.com",
  TCS: "tcs.com",
  HDFCBANK: "hdfcbank.com",
  TATAMOTORS: "tatamotors.com",
  // a few more common NSE names for convenience
  ICICIBANK: "icicibank.com",
  SBIN: "sbi.co.in",
  WIPRO: "wipro.com",
  ITC: "itcportal.com",
  AXISBANK: "axisbank.com",
  KOTAKBANK: "kotak.com",
  LT: "larsentoubro.com",
  BHARTIARTL: "airtel.in",
  HINDUNILVR: "hul.co.in",
  MARUTI: "marutisuzuki.com",
  SUNPHARMA: "sunpharma.com",
  ASIANPAINT: "asianpaints.com",
  BAJFINANCE: "bajajfinserv.in",
  ADANIENT: "adani.com",
  TATASTEEL: "tatasteel.com",
};

export function logoUrl(symbol: string): string | null {
  const domain = DOMAINS[symbol.toUpperCase()];
  if (!domain) return null;
  return `https://img.logo.dev/${domain}?token=${PUBLISHABLE_KEY}&size=80&format=png&retina=true`;
}

// Ticker → company name (same coverage as the domain map). Returns null for
// unmapped symbols so the UI can fall back to just the ticker.
const NAMES: Record<string, string> = {
  RELIANCE: "Reliance Industries",
  INFY: "Infosys",
  TCS: "Tata Consultancy Services",
  HDFCBANK: "HDFC Bank",
  TATAMOTORS: "Tata Motors",
  ICICIBANK: "ICICI Bank",
  SBIN: "State Bank of India",
  WIPRO: "Wipro",
  ITC: "ITC",
  AXISBANK: "Axis Bank",
  KOTAKBANK: "Kotak Mahindra Bank",
  LT: "Larsen & Toubro",
  BHARTIARTL: "Bharti Airtel",
  HINDUNILVR: "Hindustan Unilever",
  MARUTI: "Maruti Suzuki",
  SUNPHARMA: "Sun Pharma",
  ASIANPAINT: "Asian Paints",
  BAJFINANCE: "Bajaj Finance",
  ADANIENT: "Adani Enterprises",
  TATASTEEL: "Tata Steel",
};

export function companyName(symbol: string): string | null {
  return NAMES[symbol.toUpperCase()] ?? null;
}
