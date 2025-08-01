export type Book = {
  id: string;
  title: string;
  author: string;
  coverImage: string;
  fileType: 'PDF' | 'EPUB' | 'MOBI' | 'DOCX' | 'TXT';
  content: string;
}
