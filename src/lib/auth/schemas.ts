import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .max(254, "Enter a valid email address.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password must be 128 characters or fewer.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Enter your password.")
    .max(128, "Password must be 128 characters or fewer."),
});

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().max(128),
    marketingEmailOptIn: z.boolean().default(false),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().max(128),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({ email: emailSchema });

export const emailVerificationOtpSchema = z.object({
  email: emailSchema,
  token: z
    .string()
    .trim()
    .max(6, "Enter the 6-digit verification code.")
    .regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});

export const phoneOtpRequestSchema = z.object({
  countryCode: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{0,3}$/, "Choose a valid country code."),
  phone: z
    .string()
    .trim()
    .min(6, "Enter a valid phone number.")
    .max(18, "Enter a valid phone number."),
});

export const phoneOtpVerifySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Enter a valid international phone number."),
  token: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit verification code."),
});

export function normalizePhoneNumber(countryCode: string, phone: string) {
  const trimmed = phone.trim();
  const candidate = trimmed.startsWith("+")
    ? `+${trimmed.slice(1).replace(/\D/g, "")}`
    : `${countryCode}${trimmed.replace(/\D/g, "")}`;

  return /^\+[1-9]\d{7,14}$/.test(candidate) ? candidate : null;
}
