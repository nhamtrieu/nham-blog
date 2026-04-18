import { z } from "zod";

export const signInCredentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export type SignInCredentials = z.infer<typeof signInCredentialsSchema>;
