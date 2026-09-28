import { z } from "zod";

export const submissionSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  workEmail: z.string().email("A valid work email is required").max(320),
  pitchSummary: z.string().min(20, "Tell us a little more").max(5000),
  reviewType: z.enum(["standard", "priority"]),
  // Deck is uploaded separately; this is the storage path if present.
  deckPath: z.string().max(1024).optional().nullable(),
});

export type SubmissionInput = z.infer<typeof submissionSchema>;
