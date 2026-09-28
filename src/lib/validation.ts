import { z } from "zod";

export const submissionSchema = z.object({
  contactName: z.string().min(1, "Your name is required").max(200),
  email: z.string().email("A valid email is required").max(320),
  phone: z
    .string()
    .min(6, "A valid WhatsApp number is required")
    .max(20)
    .regex(/^[+0-9 ()-]+$/, "Enter a valid phone number"),
  companyName: z.string().min(1, "Company name is required").max(200),
  pitchSummary: z.string().min(20, "Tell us a little more").max(5000),
  website: z.string().url("Enter a valid URL").max(500).optional().or(z.literal("")),
  socials: z.string().max(1000).optional().or(z.literal("")),
  reviewType: z.enum(["standard", "priority"]),
  // Deck is uploaded separately; this is the storage path if present.
  deckPath: z.string().max(1024).optional().nullable(),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
