import { z } from 'zod';
import { chatModels } from '@/lib/ai/models';

const textPartSchema = z.object({
  text: z.string().min(1).max(2000),
  type: z.enum(['text']),
});

// Generate valid model IDs from the models.ts file
const validModelIds = chatModels.map((model) => model.id) as [
  string,
  ...string[],
];

export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    createdAt: z.coerce.date(),
    role: z.enum(['user']),
    content: z.string().min(1).max(2000),
    parts: z.array(textPartSchema),
    experimental_attachments: z
      .array(
        z.object({
          url: z.string().url(),
          name: z.string().min(1).max(2000),
          contentType: z.enum(['image/png', 'image/jpg', 'image/jpeg']),
        }),
      )
      .optional(),
  }),
  selectedChatModel: z.enum(validModelIds),
  selectedVisibilityType: z.enum(['public', 'private']),
  sessionId: z.string().optional(),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
