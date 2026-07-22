export const PAID_SEAT_PRICE_CENTS = 1000;
export const PAID_SEAT_CURRENCY = "CAD";
export const PAID_SEAT_QUANTITY_MIN = 1;
export const PAID_SEAT_QUANTITY_MAX = 3;

export function formatPaidSeatPrice() {
  return `$${(PAID_SEAT_PRICE_CENTS / 100).toFixed(2)} ${PAID_SEAT_CURRENCY} one-time`;
}
