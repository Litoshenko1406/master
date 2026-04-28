// @vitest-environment node
import { describe, test, expect, vi, beforeEach } from "vitest";
import { jwtVerify } from "jose";

vi.mock("server-only", () => ({}));

const mockSet = vi.fn();
const mockGet = vi.fn();
const mockDelete = vi.fn();

vi.mock("next/headers", () => ({
  cookies: vi.fn(() =>
    Promise.resolve({ set: mockSet, get: mockGet, delete: mockDelete })
  ),
}));

const JWT_SECRET = new TextEncoder().encode("development-secret-key");

describe("createSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("sets an httpOnly cookie with the correct name", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");

    expect(mockSet).toHaveBeenCalledOnce();
    const [cookieName] = mockSet.mock.calls[0];
    expect(cookieName).toBe("auth-token");
  });

  test("cookie contains a valid signed JWT with userId and email", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-42", "hello@example.com");

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("hello@example.com");
  });

  test("JWT expires in approximately 7 days", async () => {
    const before = Date.now();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, token] = mockSet.mock.calls[0];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    const expMs = (payload.exp as number) * 1000;

    expect(expMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });

  test("cookie options are httpOnly, lax sameSite, and path /", async () => {
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");

    const [, , options] = mockSet.mock.calls[0];
    expect(options.httpOnly).toBe(true);
    expect(options.sameSite).toBe("lax");
    expect(options.path).toBe("/");
  });

  test("cookie expiry matches the session expiresAt (~7 days)", async () => {
    const before = Date.now();
    const { createSession } = await import("@/lib/auth");
    await createSession("user-1", "test@example.com");
    const after = Date.now();

    const [, , options] = mockSet.mock.calls[0];
    const expiresMs = options.expires instanceof Date
      ? options.expires.getTime()
      : Number(options.expires);

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresMs).toBeGreaterThanOrEqual(before + sevenDaysMs - 1000);
    expect(expiresMs).toBeLessThanOrEqual(after + sevenDaysMs + 1000);
  });
});
