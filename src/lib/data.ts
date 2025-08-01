import type { Book } from './types';

// Helper to generate a simple data URI cover
const createFallbackCover = (title: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#f5f5dc'; // beige
        ctx.fillRect(0, 0, 300, 400);
        ctx.fillStyle = '#a0522d'; // sienna
        ctx.font = '20px sans-serif';
        ctx.textAlign = 'center';
        
        // Simple word wrap
        const words = title.split(' ');
        let line = '';
        let y = 180;
        for(let n = 0; n < words.length; n++) {
          let testLine = line + words[n] + ' ';
          let metrics = ctx.measureText(testLine);
          let testWidth = metrics.width;
          if (testWidth > 280 && n > 0) {
            ctx.fillText(line, 150, y);
            line = words[n] + ' ';
            y += 25;
          }
          else {
            line = testLine;
          }
        }
        ctx.fillText(line, 150, y);
    }
    return canvas.toDataURL();
}


export const mockBooks: Book[] = [
  {
    id: '1',
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    coverImage: createFallbackCover('The Great Gatsby'),
    fileType: 'EPUB',
    content: "In my younger and more vulnerable years my father gave me some advice that I've been turning over in my mind ever since. 'Whenever you feel like criticizing any one,' he told me, 'just remember that all the people in this world haven't had the advantages that you've had.'",
    bookmarks: [],
  },
  {
    id: '2',
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    coverImage: createFallbackCover('To Kill a Mockingbird'),
    fileType: 'PDF',
    content: "When he was nearly thirteen, my brother Jem got his arm badly broken at the elbow. When it healed, and Jem's fears of never being able to play football were assuaged, he was seldom self-conscious about his injury.",
    bookmarks: [],
  },
  {
    id: '3',
    title: '1984',
    author: 'George Orwell',
    coverImage: createFallbackCover('1984'),
    fileType: 'MOBI',
    content: "It was a bright cold day in April, and the clocks were striking thirteen. Winston Smith, his chin nuzzled into his breast in an effort to escape the vile wind, slipped quickly through the glass doors of Victory Mansions, though not quickly enough to prevent a swirl of gritty dust from entering along with him.",
    bookmarks: [],
  },
  {
    id: '4',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    coverImage: createFallbackCover('Pride and Prejudice'),
    fileType: 'DOCX',
    content: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
    bookmarks: [],
  },
    {
    id: '5',
    title: 'The Hobbit',
    author: 'J.R.R. Tolkien',
    coverImage: createFallbackCover('The Hobbit'),
    fileType: 'EPUB',
    content: "In a hole in the ground there lived a hobbit. Not a nasty, dirty, wet hole, filled with the ends of worms and an oozy smell, nor yet a dry, bare, sandy hole with nothing in it to sit down on or to eat: it was a hobbit-hole, and that means comfort.",
    bookmarks: [],
  },
  {
    id: '6',
    title: 'A Tale of Two Cities',
    author: 'Charles Dickens',
    coverImage: createFallbackCover('A Tale of Two Cities'),
    fileType: 'TXT',
    content: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair.",
    bookmarks: [],
  },
  {
    id: '7',
    title: 'האריה והעכבר',
    author: 'איזופוס',
    coverImage: createFallbackCover('האריה והעכבר'),
    fileType: 'TXT',
    content: "אריה ישן ביער. עכבר קטן התרוצץ לידו והעיר אותו. האריה הכועס תפס את העכבר ורצה לאכול אותו. 'בבקשה, שחרר אותי,' צייץ העכבר. 'אולי יום אחד אוכל לעזור לך.' האריה צחק ושיחרר אותו. כמה ימים לאחר מכן, ציידים לכדו את האריה ברשת. העכבר שמע את שאגותיו, רץ אל הרשת, וכרסם את החבלים עד שהאריה היה חופשי. 'אתה רואה,' אמר העכבר, 'גם עכבר קטן יכול לעזור לאריה גדול.'",
    bookmarks: [],
  },
];
