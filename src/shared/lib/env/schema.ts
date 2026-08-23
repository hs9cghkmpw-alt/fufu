import { z } from 'zod';

const optionalUrl = z.union([z.literal(''), z.url()]).optional();
const optionalPublishableKey = z
  .union([
    z.literal(''),
    z
      .string()
      .min(20)
      .refine((value) => !/service[_-]?role|secret/i.test(value), '公開可能キーのみ使用できます')
  ])
  .optional();

export const publicEnvSchema = z
  .object({
    VITE_SUPABASE_URL: optionalUrl,
    VITE_SUPABASE_PUBLISHABLE_KEY: optionalPublishableKey
  })
  .superRefine((env, context) => {
    const hasUrl = Boolean(env.VITE_SUPABASE_URL);
    const hasKey = Boolean(env.VITE_SUPABASE_PUBLISHABLE_KEY);
    if (hasUrl !== hasKey)
      context.addIssue({
        code: 'custom',
        message: 'Supabase URLと公開可能キーは両方設定してください'
      });
  });

export type PublicEnv = z.infer<typeof publicEnvSchema>;
