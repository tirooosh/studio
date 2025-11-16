# LinguaLecta

LinguaLecta is a modern, offline-first, browser-based e-reader Progressive Web App (PWA). Import your own documents (PDF, TXT) and build your personal library, accessible anytime, anywhere.

## Features

-   **Import Local Files**: Import local PDF and TXT files.
-   **Automatic Text Extraction**: Automatically extracts text from PDF files.
-   **Automatic Cover Generation**: Automatically generates a cover from the first page of a PDF.
-   **Offline Capable**: Fully offline-capable library.
-   **PWA**: Installable as a PWA on desktop and mobile.
-   **Dark Mode**: Dark mode and adjustable font size.
-   **Bookmarks**: Bookmark support.

## How it Works

LinguaLecta is a 100% client-side application built with Next.js in static site generation mode. It runs entirely in the browser, with no backend server. All imported books are stored in the browser's `localStorage`, making the application fully offline-first. A custom service worker built with Workbox aggressively caches the application shell, pages, and assets, ensuring a robust offline experience.

## Tech Stack

-   **Framework**: Next.js (React)
-   **Language**: TypeScript
-   **Styling**: Tailwind CSS with shadcn/ui
-   **Core Logic**: `pdfjs-dist` for PDF text extraction and cover generation.
-   **Persistence**: Browser `localStorage`
-   **Offline**: Workbox

## Getting Started

1.  Clone the repository:
    ```bash
    git clone https://github.com/your-username/lingualecta.git
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```

## Important Notes

-   While the file input accepts various formats, only PDF and TXT are properly parsed.
-   The `firebase` dependency is present in `package.json` but is not used in the application.