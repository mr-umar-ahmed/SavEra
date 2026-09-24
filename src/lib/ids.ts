/**
 * Client-side id generation for entities created through the UI (reports, bookings,
 * notifications, ...). Not used by the seed, which must stay deterministic.
 * Ids combine a per-session counter with Math.random() so they stay unique across
 * quick successive writes without depending on the clock.
 */

const BASE36 = "0123456789abcdefghijklmnopqrstuvwxyz";
const BASE32_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

let counter = 0;

function randomChars(alphabet: string, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

/** `newId("wr")` → `wr-1k7f3q9z`: prefix, dash, counter (base36), 6 random base36 chars. */
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${counter.toString(36)}${randomChars(BASE36, 6)}`;
}

/** Human-readable reference such as `SVR-PAY-7KQ2M9` for receipts and bookings. */
export function newRef(prefix: string, length = 6): string {
  return `${prefix.toUpperCase()}-${randomChars(BASE32_UPPER, length)}`;
}
