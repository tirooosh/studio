
"use client";

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import dynamic from 'next/dynamic';
import {
  UploadCloud,
  Settings2,
  BookOpen,
  Download,
} from 'lucide-react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import * as pdfjsLib from 'pdfjs-dist';

import type { Book } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo } from '@/components/icons';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { BookCard } from '@/components/book-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

const ReaderViewSkeleton = () => (
    <div className="flex flex-col h-dvh bg-background">
      <header className="p-4 border-b flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10 h-20 md:h-24">
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-10 rounded-full" />
      </header>
      <ScrollArea className="flex-grow">
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-12">
           <div className="flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-12 items-start mb-8">
              <Skeleton className="rounded-lg shadow-2xl object-cover mx-auto w-48 h-64 md:w-64 md:h-80 flex-shrink-0" />
              <div className="pt-2 md:pt-4 flex-1 w-full">
                <Skeleton className="h-10 w-3/4 mb-4" />
                <Skeleton className="h-8 w-1/2 mb-6" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <Separator className="my-6 md:my-8" />
            <div className="space-y-4">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-5/6" />
              <Skeleton className="h-6 w-full" />
            </div>
        </div>
       </ScrollArea>
       <div className="p-4 border-t bg-card/80 backdrop-blur-sm sticky bottom-0 h-28 flex flex-col justify-center">
            <Skeleton className="h-2 w-full max-w-lg mx-auto mb-2" />
            <div className="max-w-lg mx-auto flex items-center justify-around gap-2 w-full">
                <Skeleton className="h-16 w-16 rounded-full" />
                <Skeleton className="h-20 w-20 rounded-full" />
                <Skeleton className="h-16 w-16 rounded-full" />
            </div>
        </div>
    </div>
);

const ReaderView = dynamic(() => import('@/components/reader-view').then(mod => mod.ReaderView), {
  loading: () => <ReaderViewSkeleton />,
});

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

const LibrarySkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 p-4 md:p-6">
    {Array.from({ length: 6 }).map((_, i) => (
      <Card key={i}>
        <CardHeader className="p-0">
          <Skeleton className="aspect-[3/4] w-full" />
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
        <CardFooter className="p-4 pt-0 flex justify-between items-center">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </CardFooter>
      </Card>
    ))}
  </div>
);

const AppSettings = ({ isDarkMode, toggleDarkMode, installPrompt, onInstall }: { isDarkMode: boolean; toggleDarkMode: (checked: boolean) => void; installPrompt: BeforeInstallPromptEvent | null; onInstall: () => void; }) => {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                    <Settings2 className="mr-2 h-4 w-4" /> Settings
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-6">
                <div className="grid gap-6">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none font-headline text-lg">Settings</h4>
                        <p className="text-base text-muted-foreground">
                            Customize your app experience.
                        </p>
                    </div>
                    <div className="grid gap-4 text-base">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="app-dark-mode-switch" className="text-base">Dark Mode</Label>
                            <Switch id="app-dark-mode-switch" checked={isDarkMode} onCheckedChange={toggleDarkMode} />
                        </div>
                        {installPrompt && (
                          <>
                            <Separator />
                            <Button onClick={onInstall} className="mt-2 w-full text-base">
                              <Download className="mr-2 h-5 w-5" /> Install App
                            </Button>
                          </>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};


const LibraryView = ({ books, onSelectBook, onRename, onDelete, onImportClick, isLoading, isDarkMode, toggleDarkMode, installPrompt, onInstall }: { books: Book[], onSelectBook: (book: Book) => void, onRename: (book: Book) => void, onDelete: (book: Book) => void, onImportClick: () => void, isLoading: boolean, isDarkMode: boolean, toggleDarkMode: (checked: boolean) => void, installPrompt: BeforeInstallPromptEvent | null; onInstall: () => void; }) => (
  <div className="h-dvh flex flex-col">
    <header className="p-4 border-b flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <h1 className="font-headline text-xl font-bold">LinguaLecta</h1>
      </div>
       <div className="flex items-center gap-2">
        <Button onClick={onImportClick} size="sm">
            <UploadCloud className="mr-2 h-4 w-4" /> Import
        </Button>
        <AppSettings isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} installPrompt={installPrompt} onInstall={onInstall} />
      </div>
    </header>
    <ScrollArea className="flex-grow">
       {isLoading ? <LibrarySkeleton /> : books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 p-4 md:p-6">
            {books.map(book => (
            <BookCard
                key={book.id}
                book={book}
                onSelectBook={onSelectBook}
                onRename={onRename}
                onDelete={onDelete}
            />
            ))}
        </div>
        ) : (
        <div className="flex flex-col items-center justify-center h-full text-center p-8 min-h-[calc(100vh-80px)]">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">Your library is empty</h3>
            <p className="text-sm text-muted-foreground">Import a book to get started.</p>
        </div>
        )}
    </ScrollArea>
  </div>
);


export function LinguaLecta() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [dialogState, setDialogState] = useState<{ type: 'rename' | 'delete'; book: Book | null }>({ type: 'rename', book: null });
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [fontSize, setFontSize] = useState(100);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      toast({ title: 'Installation successful!', description: 'LinguaLecta is now on your device.' });
    }
    setInstallPrompt(null);
  };

  useEffect(() => {
    const storedTheme = localStorage.getItem('lingualecta-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (storedTheme === 'dark' || (!storedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
    }

    const storedFontSize = localStorage.getItem('lingualecta-fontsize');
    if (storedFontSize) {
        setFontSize(parseInt(storedFontSize, 10));
    }


    let storedBooks: Book[] = [];
    try {
      const storedBooksJSON = localStorage.getItem('lingualecta-books');
      if (storedBooksJSON) {
        storedBooks = JSON.parse(storedBooksJSON);
      }
    } catch (error) {
      console.error("Could not load books from local storage", error);
      toast({
          title: "Error loading books",
          description: "Could not load your library. Using default books.",
          variant: "destructive"
      })
    }

    setBooks(storedBooks);
    setIsLoading(false);
    
    // Setup worker for pdf.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;

  }, [toast]);

  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem('lingualecta-books', JSON.stringify(books));
      } catch (error) {
          console.error("Could not save books to local storage", error);
          toast({
              title: "Error saving library",
              description: "Your changes might not be saved.",
              variant: "destructive"
          })
      }
    }
  }, [books, isLoading, toast]);
  
  const handleSetFontSize = (size: number) => {
    setFontSize(size);
    localStorage.setItem('lingualecta-fontsize', size.toString());
  };

  const toggleDarkMode = (checked: boolean) => {
    setIsDarkMode(checked);
    if (checked) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lingualecta-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lingualecta-theme', 'light');
    }
  };
  
  const generatePdfCover = async (pdf: PDFDocumentProxy): Promise<string> => {
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Could not get canvas context');
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport }).promise;
      
      return canvas.toDataURL();
    } catch (error) {
      console.error("Failed to generate PDF cover:", error);
      // Return a placeholder if cover generation fails
      return 'https://placehold.co/300x400.png';
    }
  };


  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const fileType = (file.name.split('.').pop()?.toUpperCase() as Book['fileType']) || 'TXT';

      const createBook = (content: string, coverImage: string) => {
        if (!content) {
          toast({
            title: 'File Read Error',
            description: `Could not read the file ${file.name}. It might be empty.`,
            variant: 'destructive',
          });
          return;
        }

        const newBook: Book = {
          id: new Date().toISOString(),
          title: file.name.replace(/\.[^/.]+$/, ''),
          author: 'Unknown Author',
          coverImage,
          fileType,
          content: content.replace(/(\r\n|\n|\r)/gm, "\n").replace(/\n\n+/g, '\n'),
          bookmarks: [],
        };

        setBooks(prev => [newBook, ...prev]);
        toast({
          title: 'Book Imported',
          description: `${file.name} has been added to your library.`,
        });
        handleSelectBook(newBook);
      };

      if (fileType === 'PDF') {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            if (!e.target?.result) throw new Error("File reading failed");
            
            const loadingTask = pdfjsLib.getDocument(new Uint8Array(e.target.result as ArrayBuffer));
            const pdf = await loadingTask.promise;
            
            const coverImage = await generatePdfCover(pdf);

            let fullText = '';
            for (let i = 1; i <= pdf.numPages; i++) {
              const page = await pdf.getPage(i);
              const textContent = await page.getTextContent();
              const pageText = textContent.items.map(item => (item as any).str).join(' ');
              fullText += pageText + '\n\n';
            }
            createBook(fullText.replace(/\n\s*\n/g, '\n'), coverImage);
          } catch (error) {
            console.error('Error parsing PDF:', error);
            toast({
              title: 'PDF Parse Error',
              description: `Could not parse the PDF file ${file.name}.`,
              variant: 'destructive',
            });
          }
        };
        reader.onerror = () => {
          toast({
            title: 'File Read Error',
            description: `Could not read the file ${file.name}.`,
            variant: 'destructive',
          });
        };
        reader.readAsArrayBuffer(file);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => {
          const fallbackCover = 'https://placehold.co/300x400.png';
          createBook(e.target?.result as string, fallbackCover);
        };
        reader.onerror = () => {
          toast({
            title: 'File Read Error',
            description: `Could not read the file ${file.name}.`,
            variant: 'destructive',
          });
        };
        reader.readAsText(file);
      }
    }
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };
  
  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
  }

  const handleUpdateBook = (updatedBook: Book) => {
    setBooks(books.map(b => b.id === updatedBook.id ? updatedBook : b));
    if (selectedBook?.id === updatedBook.id) {
        setSelectedBook(updatedBook);
    }
  };

  const handleRenameRequest = (book: Book) => {
    setRenameValue(book.title);
    setDialogState({ type: 'rename', book });
  };

  const handleDeleteRequest = (book: Book) => {
    setDialogState({ type: 'delete', book });
  };
  
  const handleConfirmRename = () => {
    if (dialogState.book) {
      const updatedBook = { ...dialogState.book, title: renameValue };
      handleUpdateBook(updatedBook);
      toast({ title: "Book renamed successfully." });
      setDialogState({ type: 'rename', book: null });
    }
  };

  const handleConfirmDelete = () => {
    if (dialogState.book) {
      setBooks(books.filter(b => b.id !== dialogState.book!.id));
      if (selectedBook?.id === dialogState.book.id) {
        setSelectedBook(null);
      }
      toast({ title: "Book deleted.", variant: 'destructive' });
      setDialogState({ type: 'delete', book: null });
    }
  };


  return (
    <div className="bg-background font-body text-foreground h-dvh">
      {selectedBook ? (
        <ReaderView 
          book={selectedBook} 
          onOpenLibrary={() => setSelectedBook(null)}
          onUpdateBook={handleUpdateBook} 
          isDarkMode={isDarkMode}
          toggleDarkMode={toggleDarkMode}
          fontSize={fontSize}
          setFontSize={handleSetFontSize}
          installPrompt={installPrompt}
          onInstall={handleInstallClick}
        />
      ) : (
        <>
            <LibraryView
                books={books}
                onSelectBook={handleSelectBook}
                onRename={handleRenameRequest}
                onDelete={handleDeleteRequest}
                onImportClick={() => fileInputRef.current?.click()}
                isLoading={isLoading}
                isDarkMode={isDarkMode}
                toggleDarkMode={toggleDarkMode}
                installPrompt={installPrompt}
                onInstall={handleInstallClick}
            />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileImport} accept=".pdf,.txt,.epub,.mobi,.docx"/>
        </>
      )}

      <AlertDialog open={!!dialogState.book && dialogState.type === 'rename'} onOpenChange={() => setDialogState({ ...dialogState, book: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rename Book</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a new name for "{dialogState.book?.title}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="rename-input" className="sr-only">New Name</Label>
            <Input id="rename-input" value={renameValue} onChange={(e) => setRenameValue(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleConfirmRename()} />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRename}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={!!dialogState.book && dialogState.type === 'delete'} onOpenChange={() => setDialogState({ ...dialogState, book: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete "{dialogState.book?.title}" from your library.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
