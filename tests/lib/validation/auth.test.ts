import { describe, expect, it } from "vitest";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

describe("signUpSchema (authentication)", () => {
  it("rejects a password shorter than 8 characters", () => {
    const result = signUpSchema.safeParse({
      email: "coach@ashfall.fc",
      password: "abc123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no letter", () => {
    const result = signUpSchema.safeParse({
      email: "coach@ashfall.fc",
      password: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password with no number", () => {
    const result = signUpSchema.safeParse({
      email: "coach@ashfall.fc",
      password: "abcdefgh",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email address", () => {
    const result = signUpSchema.safeParse({
      email: "not-an-email",
      password: "abcd1234",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid email and a password with a letter and a number", () => {
    const result = signUpSchema.safeParse({
      email: "coach@ashfall.fc",
      password: "abcd1234",
    });
    expect(result.success).toBe(true);
  });
});

describe("signInSchema (authentication)", () => {
  it("rejects an empty password (unlike sign-up, it doesn't need to be strong — just present)", () => {
    const result = signInSchema.safeParse({
      email: "coach@ashfall.fc",
      password: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts any non-empty password alongside a valid email", () => {
    const result = signInSchema.safeParse({
      email: "coach@ashfall.fc",
      password: "whatever-was-set-at-signup",
    });
    expect(result.success).toBe(true);
  });
});
