
"use client";

import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import Image from 'next/image';
import {
  MoreVertical,
  UploadCloud,
  Play,
  Pause,
  Rewind,
  FastForward,
  BookOpen,
  Settings2,
  Menu,
  Bookmark,
  Trash2,
} from 'lucide-react';

import type { Book, Bookmark as BookmarkType } from '@/lib/types';
import { mockBooks } from '@/lib/data';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Logo, FileTypeIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


interface BookCardProps {
  book: Book;
  onSelectBook: (book: Book) => void;
  onRename: (book: Book) => void;
  onDelete: (book: Book) => void;
}

function BookCard({ book, onSelectBook, onRename, onDelete }: BookCardProps) {
  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <CardHeader className="p-0">
        <button onClick={() => onSelectBook(book)} className="block w-full text-left">
          <Image
            src={book.coverImage}
            alt={`Cover of ${book.title}`}
            width={300}
            height={400}
            className="aspect-[3/4] w-full object-cover transition-transform duration-300 group-hover:scale-105"
            data-ai-hint="book cover"
          />
        </button>
      </CardHeader>
      <CardContent className="p-4">
        <h3 className="font-headline font-semibold tracking-tight truncate">{book.title}</h3>
        <p className="text-sm text-muted-foreground">{book.author}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-between items-center">
        <FileTypeIcon fileType={book.fileType} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">More options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onSelectBook(book)}>Read Now</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRename(book)}>Rename</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(book)} className="text-destructive">Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardFooter>
    </Card>
  );
}

function ReaderView({ 
  book, 
  onOpenLibrary,
  onUpdateBook,
}: { 
  book: Book | null, 
  onOpenLibrary: () => void,
  onUpdateBook: (book: Book) => void,
}) {
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        const hebrewVoice = availableVoices.find(v => v.lang === 'he-IL');
        const englishVoice = availableVoices.find(v => v.lang.startsWith('en'));
        
        let defaultVoice;
        if (book && /[\u0590-\u05FF]/.test(book.content)) { // Check for Hebrew characters
            defaultVoice = hebrewVoice || englishVoice || availableVoices[0];
        } else {
            defaultVoice = englishVoice || availableVoices[0];
        }
        setSelectedVoice(defaultVoice?.name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [book]);
  
  const stopSpeech = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setPlaybackState('stopped');
    utteranceRef.current = null;
  };

  const jumpTo = (charIndex: number) => {
    if (!book) return;
    stopSpeech();
    // Timeout to ensure cancel() has time to process fully
    setTimeout(() => setupUtterance(book, charIndex), 100);
  }
  
  const playSpeech = (startChar?: number) => {
    if (utteranceRef.current === null) {
      if (book) {
        setupUtterance(book, startChar ?? currentCharIndex);
      }
      return;
    }

    if (speechSynthesis.paused && playbackState === 'paused') {
      speechSynthesis.resume();
    } else {
      speechSynthesis.speak(utteranceRef.current);
    }
    setPlaybackState('playing');
  };

  const pauseSpeech = () => {
    speechSynthesis.pause();
    setPlaybackState('paused');
  };

  const rewindSpeech = () => {
    jumpTo(Math.max(0, currentCharIndex - 250)); // Rewind ~15s
  };
  
  const fastForwardSpeech = () => {
    if (!book) return;
    jumpTo(Math.min(currentCharIndex + 250, book.content.length - 1));
  }

  const handlePlayPauseClick = () => {
    if (playbackState === 'playing') {
      pauseSpeech();
    } else {
      playSpeech();
    }
  };

  const setupUtterance = (currentBook: Book, startChar: number = 0) => {
    const contentToSpeak = currentBook.content.substring(startChar);
    if (!contentToSpeak) {
        setPlaybackState('stopped');
        return;
    };

    const utterance = new SpeechSynthesisUtterance(contentToSpeak);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = playbackSpeed;
    utterance.pitch = pitch;

    utterance.onboundary = (event) => {
      const globalCharIndex = startChar + event.charIndex;
      setCurrentCharIndex(globalCharIndex);
      setProgress((globalCharIndex / currentBook.content.length) * 100);
    };
    
    utterance.onend = () => {
      setPlaybackState('stopped');
      // Don't reset to 0, show completion
      setProgress(100);
      setCurrentCharIndex(currentBook.content.length);
    };
    
    utteranceRef.current = utterance;
    playSpeech();
  };
  
  useEffect(() => {
    if (!book) {
      stopSpeech();
      setProgress(0);
      setCurrentCharIndex(0);
      return;
    };

    stopSpeech();
    
    // When book changes, reset progress
    setProgress(0);
    setCurrentCharIndex(0);
    
    // Auto-play is disabled to avoid starting immediately. User must press play.
    
    return () => {
      stopSpeech();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  useEffect(() => {
    if (utteranceRef.current) {
        utteranceRef.current.rate = playbackSpeed;
        utteranceRef.current.pitch = pitch;
        const voice = voices.find(v => v.name === selectedVoice);
        if(voice) utteranceRef.current.voice = voice;

        // If playing, restart to apply changes
        if(playbackState === 'playing') {
            stopSpeech();
            setTimeout(() => setupUtterance(book!, currentCharIndex), 100);
        }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackSpeed, pitch, selectedVoice, voices]);
  
  useEffect(() => {
    if (!book || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: book.title,
      artist: book.author,
      artwork: [{ src: book.coverImage, sizes: '300x400', type: 'image/png' }],
    });
    
    navigator.mediaSession.playbackState = playbackState === 'playing' ? 'playing' : 'paused';

    navigator.mediaSession.setActionHandler('play', () => playSpeech());
    navigator.mediaSession.setActionHandler('pause', pauseSpeech);
    navigator.mediaSession.setActionHandler('seekbackward', () => rewindSpeech());
    navigator.mediaSession.setActionHandler('seekforward', () => fastForwardSpeech());
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if(details.seekTime && book) {
            const seekChar = Math.floor((details.seekTime / book.content.length) * book.content.length);
            jumpTo(seekChar);
        }
    });


    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, playbackState, currentCharIndex]);

  const addBookmark = () => {
    if (!book) return;
    const newBookmark: BookmarkType = {
        id: new Date().toISOString(),
        charIndex: currentCharIndex,
        createdAt: new Date().toLocaleString(),
        previewText: book.content.substring(currentCharIndex, currentCharIndex + 50) + "...",
    };

    const updatedBookmarks = [...(book.bookmarks || []), newBookmark];
    onUpdateBook({ ...book, bookmarks: updatedBookmarks });
    toast({ title: "Bookmark added!" });
  };

  const deleteBookmark = (bookmarkId: string) => {
    if (!book) return;
    const updatedBookmarks = (book.bookmarks || []).filter(b => b.id !== bookmarkId);
    onUpdateBook({ ...book, bookmarks: updatedBookmarks });
    toast({ title: "Bookmark removed.", variant: "destructive" });
  };


  const SpokenText = () => {
    if (!book) return null;
    if (currentCharIndex === 0 && playbackState !== 'playing') {
      return <p>{book.content}</p>;
    }
    const spoken = book.content.substring(0, currentCharIndex);
    const remaining = book.content.substring(currentCharIndex);
    return (<p><span className="bg-accent/30">{spoken}</span>{remaining}</p>);
  };

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BookOpen className="h-24 w-24 text-muted-foreground/50 mb-6" />
        <h2 className="font-headline text-2xl font-bold">Welcome to LinguaLecta</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Select a book from your library to start reading, or import a new file to begin your audio journey.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
       <header className="md:hidden p-4 border-b flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={onOpenLibrary}>
            <Menu />
            <span className="sr-only">Open Library</span>
        </Button>
        <div className="text-center">
            <h2 className="font-semibold truncate max-w-[200px]">{book?.title}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={addBookmark}>
            <Bookmark />
            <span className="sr-only">Add Bookmark</span>
        </Button>
      </header>

      <ScrollArea className="flex-grow">
        <div className="max-w-4xl mx-auto p-6 lg:p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start mb-8">
            <Image
              src={book.coverImage}
              alt={`Cover of ${book.title}`}
              width={200}
              height={300}
              className="rounded-lg shadow-lg aspect-[3/4] object-cover"
              data-ai-hint="book cover"
            />
            <div className="pt-4 flex-1">
              <h1 className="font-headline text-3xl lg:text-4xl font-bold">{book.title}</h1>
              <p className="text-xl text-muted-foreground mt-2">{book.author}</p>
              <div className="flex items-center justify-between">
                <FileTypeIcon fileType={book.fileType} className="mt-4" />
                <Button variant="outline" onClick={addBookmark} className="hidden md:flex">
                    <Bookmark className="mr-2"/> Add Bookmark
                </Button>
              </div>
            </div>
          </div>
          
          <Separator className="my-8" />
          
          <Tabs defaultValue="content">
            <TabsList className="mb-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="bookmarks">
                Bookmarks <span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 text-xs">{book.bookmarks?.length || 0}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="content">
              <article className="prose prose-lg dark:prose-invert max-w-none text-foreground/90">
                <SpokenText />
              </article>
            </TabsContent>
            <TabsContent value="bookmarks">
              {book.bookmarks && book.bookmarks.length > 0 ? (
                <div className="space-y-4">
                  {book.bookmarks.map(b => (
                    <Card key={b.id} className="overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-grow">
                          <p className="text-sm font-medium text-muted-foreground">Added on {b.createdAt}</p>
                          <blockquote className="text-sm italic border-l-2 pl-2 mt-1">"{b.previewText}"</blockquote>
                        </div>
                        <div className="flex-shrink-0 flex gap-2">
                           <Button size="sm" variant="outline" onClick={() => jumpTo(b.charIndex)}>
                            Go to
                          </Button>
                          <Button size="icon" variant="destructive" onClick={() => deleteBookmark(b.id)}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete bookmark</span>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Bookmark className="mx-auto h-12 w-12 text-muted-foreground/50"/>
                  <h3 className="mt-4 text-lg font-semibold">No Bookmarks Yet</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Click the bookmark icon while reading to save your spot.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>

        </div>
      </ScrollArea>
      <div className="p-4 border-t bg-card/80 backdrop-blur-sm sticky bottom-0">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={rewindSpeech} aria-label="Rewind">
              <Rewind />
            </Button>
            <Button size="lg" className="rounded-full w-16 h-16" onClick={handlePlayPauseClick} aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}>
              {playbackState === 'playing' ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
            </Button>
            <Button variant="ghost" size="icon" onClick={fastForwardSpeech} aria-label="Fast Forward">
              <FastForward />
            </Button>
          </div>
          <div className="flex-grow flex items-center gap-4">
              <Image src={book.coverImage} alt={book.title} width={48} height={48} className="rounded-md aspect-square object-cover" data-ai-hint="book cover" />
              <div className="w-full">
                  <p className="font-semibold truncate">{book.title}</p>
                  <Progress value={progress} className="h-2 mt-1" />
              </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Playback Settings">
                <Settings2 />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none font-headline">Playback Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Customize your listening experience.
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="voice-select">Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger id="voice-select">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map(voice => (
                        <SelectItem key={voice.name} value={voice.name}>{voice.name} ({voice.lang})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="speed-slider">Speed ({playbackSpeed.toFixed(1)}x)</Label>
                    <Slider id="speed-slider" min={0.5} max={3} step={0.1} value={[playbackSpeed]} onValueChange={([val]) => setPlaybackSpeed(val)} />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="pitch-slider">Pitch ({pitch.toFixed(1)})</Label>
                    <Slider id="pitch-slider" min={0.5} max={2} step={0.1} value={[pitch]} onValueChange={([val]) => setPitch(val)} />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

const LibrarySkeleton = () => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-2 gap-4 p-4">
    {Array.from({ length: 4 }).map((_, i) => (
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


const LibraryContent = ({ books, onSelectBook, onRename, onDelete, onImportClick, isLoading }: { books: Book[], onSelectBook: (book: Book) => void, onRename: (book: Book) => void, onDelete: (book: Book) => void, onImportClick: () => void, isLoading: boolean}) => (
  <>
    <header className="p-4 border-b flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-2">
        <Logo className="h-8 w-8" />
        <h1 className="font-headline text-xl font-bold">LinguaLecta</h1>
      </div>
      <Button onClick={onImportClick} size="sm">
        <UploadCloud className="mr-2 h-4 w-4" /> Import
      </Button>
    </header>
    <ScrollArea className="flex-grow">
       {isLoading ? <LibrarySkeleton /> : books.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-1 lg:grid-cols-2 gap-4 p-4">
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
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <BookOpen className="h-16 w-16 text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold">Your library is empty</h3>
            <p className="text-sm text-muted-foreground">Import a book to get started.</p>
        </div>
        )}
    </ScrollArea>
  </>
);


export function LinguaLecta() {
  const [books, setBooks] = useState<Book[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [dialogState, setDialogState] = useState<{ type: 'rename' | 'delete'; book: Book | null }>({ type: 'rename', book: null });
  const [renameValue, setRenameValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);

  useEffect(() => {
    try {
      const storedBooks = localStorage.getItem('lingualecta-books');
      if (storedBooks) {
        setBooks(JSON.parse(storedBooks));
      } else {
        setBooks(mockBooks);
      }
    } catch (error) {
      console.error("Could not load books from local storage", error);
      setBooks(mockBooks);
      toast({
          title: "Error loading books",
          description: "Could not load your library. Using default books.",
          variant: "destructive"
      })
    } finally {
        setIsLoading(false);
    }
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

  const handleFileImport = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Simulate file reading and parsing
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string || `This is the content of the newly imported book "${file.name}". It's ready for you to listen.`;
        
        const newBook: Book = {
            id: new Date().toISOString(),
            title: file.name.replace(/\.[^/.]+$/, ""),
            author: 'Unknown Author',
            coverImage: 'https://placehold.co/300x400',
            fileType: (file.name.split('.').pop()?.toUpperCase() as Book['fileType']) || 'TXT',
            content: content.substring(0, 5000), // Truncate for performance
            bookmarks: [],
        };

        setBooks(prev => [newBook, ...prev]);
        toast({
            title: "Book Imported",
            description: `${file.name} has been added to your library.`,
        });
        // Automatically select new book
        handleSelectBook(newBook);
      };
      reader.onerror = () => {
          toast({
              title: "File Read Error",
              description: `Could not read the file ${file.name}.`,
              variant: "destructive"
          });
      };
      // For simplicity, we'll read as text. Real implementation would need specific parsers.
      reader.readAsText(file); 
    }
    // Reset file input
    if(fileInputRef.current) fileInputRef.current.value = "";
  };
  
  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    setIsLibraryOpen(false);
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
    <div className="flex h-dvh bg-background font-body text-foreground">
       <Sheet open={isLibraryOpen} onOpenChange={setIsLibraryOpen}>
        <SheetContent side="left" className="p-0 w-full sm:max-w-md flex flex-col md:hidden">
            <LibraryContent
                books={books}
                onSelectBook={handleSelectBook}
                onRename={handleRenameRequest}
                onDelete={handleDeleteRequest}
                onImportClick={() => {
                    fileInputRef.current?.click();
                    setIsLibraryOpen(false);
                }}
                isLoading={isLoading}
            />
        </SheetContent>
      </Sheet>

      <aside className="w-1/3 max-w-sm xl:max-w-md hidden md:flex flex-col border-r h-full">
         <LibraryContent
            books={books}
            onSelectBook={handleSelectBook}
            onRename={handleRenameRequest}
            onDelete={handleDeleteRequest}
            onImportClick={() => fileInputRef.current?.click()}
            isLoading={isLoading}
        />
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileImport} accept=".pdf,.epub,.mobi,.docx,.txt"/>
      </aside>

      <main className="flex-1 h-full">
        <ReaderView book={selectedBook} onOpenLibrary={() => setIsLibraryOpen(true)} onUpdateBook={handleUpdateBook} />
      </main>

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
