const PAYFAST_IPV4_CIDRS = [
  "197.97.145.144/28", "41.74.179.192/27", "102.216.36.0/28",
  "102.216.36.128/28", "144.126.193.139/32",
] as const;

function ipv4Integer(value: string) {
  const parts = value.trim().split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part) || Number(part) > 255)) return null;
  return parts.reduce((result, part) => (result * 256 + Number(part)) >>> 0, 0);
}

export function ipv4InCidr(address: string, cidr: string) {
  const [networkText, prefixText] = cidr.split("/");
  const addressValue = ipv4Integer(address);
  const networkValue = ipv4Integer(networkText);
  const prefix = Number(prefixText);
  if (addressValue === null || networkValue === null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) return false;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return (addressValue & mask) === (networkValue & mask);
}

export function isTrustedPayFastAddress(address: string) {
  return PAYFAST_IPV4_CIDRS.some((cidr) => ipv4InCidr(address, cidr));
}

export function requestPayFastAddress(headers: Headers, runtime = process.env.NODE_ENV) {
  const value = runtime === "production"
    ? headers.get("x-vercel-forwarded-for")
    : headers.get("x-payfast-test-ip") ?? headers.get("x-vercel-forwarded-for");
  return value?.split(",")[0]?.trim() ?? "";
}
