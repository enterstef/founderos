import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().email({ message: "Te rugăm să introduci un email valid." }),
  password: z.string().min(6, { message: "Parola trebuie să aibă cel puțin 6 caractere." }),
});

export type LoginInput = z.infer<typeof LoginSchema>;
