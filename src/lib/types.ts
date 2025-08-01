export type Bookmark = {
  id: string;
  charIndex: number;
  createdAt: string;
  previewText: string;
}

export type Book = {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  fileType: 'PDF' | 'EPUB' | 'MOBI' | 'DOCX' | 'TXT';
  content: string;
  bookmarks?: Bookmark[];
}
