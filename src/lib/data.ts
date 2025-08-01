import type { Book } from './types';

// This file is now empty of its previous content, as the mock book generation
// has been moved into the LinguaLecta component to avoid server-side rendering
// issues with browser-only APIs like `document`.

// You can re-add data-related utility functions here if needed,
// as long as they are environment-agnostic (don't rely on `window` or `document`).

export const mockBooks = (): Book[] => [];
