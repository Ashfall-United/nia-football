import { z } from "zod";

const emailSchema = z.email({ error: "Enter a valid email address." }).trim();

const passwordSchema = z
  .string()
  .min(8, { error: "Password must be at least 8 characters." })
  .regex(/[a-zA-Z]/, { error: "Password must contain a letter." })
  .regex(/[0-9]/, { error: "Password must contain a number." });

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, { error: "Enter your password." }),
});

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

export const requestPasswordResetSchema = z.object({
  email: emailSchema,
});

export const updatePasswordSchema = z.object({
  password: passwordSchema,
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type RequestPasswordResetInput = z.infer<
  typeof requestPasswordResetSchema
>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
