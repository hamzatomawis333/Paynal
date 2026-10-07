import type { PHLCity } from "@/data/phl-regions";

export interface PhilippineAddress {
  region: string;
  province: string;
  city: string;
  barangay: string;
}

export const EMPTY_ADDRESS: PhilippineAddress = {
  region: "",
  province: "",
  city: "",
  barangay: "",
};

/** Composes the single line stored in `orders.shipping_address`.
 *  Empty parts are dropped, so a partially chosen address never renders
 *  stray commas. */
export function formatAddress(address: PhilippineAddress): string {
  return [address.barangay, address.city, address.province, address.region]
    .filter((part) => part.length > 0)
    .join(", ");
}

export function isAddressComplete(address: PhilippineAddress): boolean {
  return Boolean(address.region && address.province && address.city && address.barangay);
}

/** True when `city` is a real child of the chosen province. */
export function isValidCity(
  cities: PHLCity[],
  name: string,
  province: string,
): boolean {
  return cities.some((c) => c.name === name && c.province === province);
}