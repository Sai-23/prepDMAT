import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .regex(/[A-Za-z]/, "Password must include a letter.")
  .regex(/[0-9]/, "Password must include a number.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password."),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Enter your full name.")
      .max(100, "Name must be 100 characters or fewer."),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
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
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const resendVerificationSchema = z.object({ email: emailSchema });

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
