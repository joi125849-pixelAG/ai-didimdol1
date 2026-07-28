import { z } from 'zod';

export const scaffoldSchema = z.object({
  subject: z.enum(['korean', 'math', 'social', 'science']),
  originalText: z.string(),
  summary: z.string(),
  helpTargets: z.array(
    z.object({
      id: z.string(),
      scope: z.enum(['word', 'phrase', 'sentence', 'paragraph', 'whole']),
      text: z.string(),
      simpleMeaning: z.string(),
    })
  ),
  level1Preview: z.object({
    description: z.string(),
    visualType: z.string(),
  }),
  level2Preview: z.object({
    easyRewrite: z.array(z.string()),
    chunks: z.array(z.string()),
  }),
  level3Preview: z.object({
    question: z.string(),
    questionType: z.enum(['multiple_choice', 'short_answer']),
    options: z.array(z.string()).optional(),
  }),
  wholeTextHelp: z.object({
    topic: z.string(),
    situation: z.string(),
    importantInformation: z.array(z.string()),
    target: z.string(),
  }),
});

export type ScaffoldSchemaType = z.infer<typeof scaffoldSchema>;
