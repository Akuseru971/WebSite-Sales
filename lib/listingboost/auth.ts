import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getListingBoostEnv } from "@/lib/listingboost/env";

const SESSION_COOKIE = "listingboost_admin";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 14;

function signToken(payload: string) {
  return crypto.createHmac("sha256", getListingBoostEnv().APP_ADMIN_PASSWORD).update(payload).digest("hex");
}

function createSessionValue(email: string): string {
  const ts = Date.now().toString();
  const payload = `${email}:${ts}`;
  return `${payload}:${signToken(payload)}`;
}

function verifySessionValue(value: string | undefined | null): boolean {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length < 3) return false;

  const email = parts[0];
  const ts = parts[1];
  const signature = parts.slice(2).join(":");
  const payload = `${email}:${ts}`;
  const expected = signToken(payload);

  if (signature.length !== expected.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return false;
  }

  if (email.toLowerCase() !== getListingBoostEnv().APP_ADMIN_EMAIL.toLowerCase()) {
    return false;
  }

  const age = Date.now() - Number(ts);
  if (!Number.isFinite(age) || age < 0 || age > MAX_AGE_SECONDS * 1000) {
    return false;
  }

  return true;
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const store = await cookies();
  return verifySessionValue(store.get(SESSION_COOKIE)?.value ?? null);
}

export async function requireAdminAuth(): Promise<void> {
  // Temporary bypass while the identification gate is disabled.
  return;
}

export async function createAdminSession(email: string, password: string): Promise<boolean> {
  const env = getListingBoostEnv();
  const isValid = email.trim().toLowerCase() === env.APP_ADMIN_EMAIL.toLowerCase() && password === env.APP_ADMIN_PASSWORD;

  if (!isValid) {
    return false;
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, createSessionValue(email.trim().toLowerCase()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: MAX_AGE_SECONDS,
    path: "/"
  });

  return true;
}

export async function clearAdminSession() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/"
  });
}
