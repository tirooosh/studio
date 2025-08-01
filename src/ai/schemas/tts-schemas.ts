/**
 * @fileOverview Zod schemas and TypeScript types for the text-to-speech flow.
 *
 * - TextToSpeechInputSchema - The Zod schema for the TTS input.
 * - TextToSpeechInput - The TypeScript type for the TTS input.
 * - TextToSpeechOutputSchema - The Zod schema for the TTS output.
 * - TextToSpeechOutput - The TypeScript type for the TTS output.
 */

import {z} from 'genkit';

export const TextToSpeechInputSchema = z.object({
  text: z.string().describe('The text to be converted to speech.'),
});
export type TextToSpeechInput = z.infer<typeof TextToSpeechInputSchema>;

export const TextToSpeechOutputSchema = z.object({
  audioDataUri: z
    .string()
    .describe('The generated audio as a data URI in WAV format.'),
});
export type TextToSpeechOutput = z.infer<typeof TextToSpeechOutputSchema>;
