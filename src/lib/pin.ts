import crypto from "crypto";
import bcrypt from "bcryptjs";

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCK_MINUTES = 15;
/** PIN có khoá sau 5 lần sai nên cost 8 là đủ, giúp nhập 1000 học sinh nhanh hơn nhiều so với cost 10 */
const BCRYPT_COST = 8;

export function generatePin(length = 6): string {
  let pin = "";
  for (let i = 0; i < length; i++) pin += crypto.randomInt(0, 10).toString();
  return pin;
}

export function hashPin(pin: string): Promise<string> {
  return bcrypt.hash(pin, BCRYPT_COST);
}

export function verifyPin(pin: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pin, hash);
}

export function isLocked(lockedUntil: Date | null): number {
  if (!lockedUntil) return 0;
  const ms = lockedUntil.getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 60000) : 0;
}

/** Tính trạng thái mới sau một lần nhập sai */
export function nextFailState(failedAttempts: number) {
  const count = failedAttempts + 1;
  if (count >= MAX_FAILED_ATTEMPTS) {
    return { failedAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60000), locked: true };
  }
  return { failedAttempts: count, lockedUntil: null, locked: false, remaining: MAX_FAILED_ATTEMPTS - count };
}

/** PIN yếu không được phép khi tự đổi */
export function isWeakPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) return true;
  const seq = "01234567890";
  const rev = "09876543210";
  return seq.includes(pin) || rev.includes(pin);
}
