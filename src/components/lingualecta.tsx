

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
  BookText,
  ChevronLeft,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

import type { Book, Bookmark as BookmarkType } from '@/lib/types';
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
import { mockBooks } from '@/lib/data';

// Setup worker for pdf.js
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `/pdf.worker.mjs`;
}


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
  const [currentSentence, setCurrentSentence] = useState({start: 0, end: 0});
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const [sentences, setSentences] = useState<string[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const sentenceCharStarts = useRef<number[]>([]);
  const [isCoverLandscape, setIsCoverLandscape] = useState(false);

  useEffect(() => {
    if (book?.coverImage) {
        const img = new window.Image();
        img.src = book.coverImage;
        img.onload = () => {
            setIsCoverLandscape(img.width > img.height);
        };
    } else {
        setIsCoverLandscape(false);
    }
  }, [book?.coverImage]);


  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);

        const englishVoices = availableVoices.filter(v => v.lang.startsWith('en'));
        
        // Prefer a high-quality, calming voice if available
        const calmingVoice = availableVoices.find(v => v.name === 'Google UK English Male') || 
                             availableVoices.find(v => v.name.includes('Zira')) ||
                             englishVoices.find(v => v.name.toLowerCase().includes('male'));

        let defaultVoice = calmingVoice || englishVoices[0] || availableVoices[0];
        
        setSelectedVoice(defaultVoice?.name);
      }
    };
    
    // onvoiceschanged is not reliable, especially on first load.
    if(window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
    } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const cleanup = () => {
        window.speechSynthesis.onvoiceschanged = null;
        if (speechSynthesis.speaking) {
            speechSynthesis.cancel();
        }
    };

    return cleanup;
  }, []);
  
  const stopSpeech = () => {
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
    }
    setPlaybackState('stopped');
    utteranceRef.current = null;
  };

  const jumpTo = (charIndex: number) => {
    if (!book || !sentences.length) return;
    
    stopSpeech();
    
    const clampedIndex = Math.max(0, Math.min(charIndex, book.content.length - 1));
    
    let sentenceIdx = sentenceCharStarts.current.findIndex(start => start > clampedIndex) - 1;
    if (sentenceIdx < -1) sentenceIdx = sentenceCharStarts.current.length - 1;
    if (sentenceIdx < 0) sentenceIdx = 0;
    
    const sentenceStartChar = sentenceCharStarts.current[sentenceIdx];
    const offsetInSentence = clampedIndex - sentenceStartChar;

    setCurrentSentenceIndex(sentenceIdx);
    
    // Timeout to ensure cancel() has time to process fully
    setTimeout(() => playSpeech(sentenceIdx, offsetInSentence), 100);
  }
  
  const playSpeech = (startSentence?: number, startCharInSentence?: number) => {
    if (playbackState === 'playing' || !book) return;
    if(speechSynthesis.speaking) speechSynthesis.cancel();

    if (speechSynthesis.paused && playbackState === 'paused') {
      speechSynthesis.resume();
      setPlaybackState('playing');
    } else {
        const sentenceIdx = startSentence ?? currentSentenceIndex;
        setupUtterance(sentenceIdx, startCharInSentence);
    }
  };

  const pauseSpeech = () => {
    speechSynthesis.pause();
    setPlaybackState('paused');
  };

  const rewindSpeech = () => {
    const targetIndex = currentCharIndex - 100 > 0 ? currentCharIndex - 100 : 0;
    jumpTo(targetIndex);
  };
  
  const fastForwardSpeech = () => {
    jumpTo(currentCharIndex + 100);
  }

  const handlePlayPauseClick = () => {
    if (playbackState === 'playing') {
      pauseSpeech();
    } else {
      playSpeech();
    }
  };

  const setupUtterance = (sentenceIdx: number, startCharInSentence: number = 0) => {
    if (sentenceIdx >= sentences.length) {
        setPlaybackState('stopped');
        return;
    }

    let textToSpeak = "";
    if(startCharInSentence > 0 && sentences[sentenceIdx]) {
        textToSpeak = sentences[sentenceIdx].substring(startCharInSentence);
    } else {
        textToSpeak = sentences[sentenceIdx];
    }
    
    if (!textToSpeak || !textToSpeak.trim()) {
        if (sentenceIdx < sentences.length - 1) {
            const nextIndex = sentenceIdx + 1;
            setCurrentSentenceIndex(nextIndex);
            setupUtterance(nextIndex, 0);
        } else {
            setPlaybackState('stopped');
        }
        return;
    };

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = playbackSpeed;
    utterance.pitch = pitch;

    const sentenceStartChar = sentenceCharStarts.current[sentenceIdx] || 0;
    const currentSentenceText = sentences[sentenceIdx] || '';
    
    const charIndexOffset = startCharInSentence > 0 ? startCharInSentence : 0;
    
    utterance.onstart = () => {
        setCurrentSentence({start: sentenceStartChar, end: sentenceStartChar + currentSentenceText.length});
        setPlaybackState('playing');
    }

    utterance.onboundary = (event) => {
      const globalCharIndex = sentenceStartChar + charIndexOffset + event.charIndex;
      setCurrentCharIndex(globalCharIndex);
      if (book && book.content.length > 0) {
        setProgress((globalCharIndex / book.content.length) * 100);
      }
    };
    
    utterance.onend = () => {
      const nextSentenceIndex = sentenceIdx + 1;
      if (nextSentenceIndex < sentences.length) {
          setCurrentSentenceIndex(nextSentenceIndex);
          setupUtterance(nextSentenceIndex);
      } else {
          setPlaybackState('stopped');
          setCurrentSentence({start: 0, end: 0});
          setProgress(100);
          if (book) setCurrentCharIndex(book.content.length);
          utteranceRef.current = null;
      }
    };

    utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') {
            return;
        }
        console.error("Speech Synthesis Error", event.error);
        toast({ title: "Narration Error", description: `Could not play audio: ${event.error}`, variant: "destructive" });
        setPlaybackState('stopped');
    };
    
    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (contentRef.current && currentSentence.end > 0) {
      const highlightElement = contentRef.current.querySelector('.sentence-highlight');
      if (highlightElement) {
        highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSentence]);
  
  useEffect(() => {
    if (!book) {
      stopSpeech();
      setProgress(0);
      setCurrentCharIndex(0);
      setSentences([]);
      sentenceCharStarts.current = [];
      return;
    };

    stopSpeech();
    
    const contentSentences = book.content.match(/[^.!?\n]+[.!?\n]*/g) || [book.content];
    setSentences(contentSentences);

    let charCount = 0;
    const starts = contentSentences.map(s => {
        const start = charCount;
        charCount += s.length;
        return start;
    });
    sentenceCharStarts.current = starts;
    
    let startChar = 0;
    if (book.bookmarks && book.bookmarks.length > 0) {
        const latestBookmark = book.bookmarks.reduce((latest, current) => {
            return new Date(latest.createdAt) > new Date(current.createdAt) ? latest : current;
        });
        startChar = latestBookmark.charIndex;
    }
    
    setCurrentCharIndex(startChar);
    if(book.content.length > 0) {
        setProgress((startChar / book.content.length) * 100);
    } else {
        setProgress(0);
    }
    
    let sentenceIdx = sentenceCharStarts.current.findIndex(start => start > startChar) - 1;
    if (sentenceIdx < -1) sentenceIdx = sentenceCharStarts.current.length - 1;
    if (sentenceIdx < 0) sentenceIdx = 0;
    setCurrentSentenceIndex(sentenceIdx);

    setCurrentSentence({start: 0, end: 0});
    
    const cleanup = () => {
      stopSpeech();
    };
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  useEffect(() => {
    if (playbackState !== 'playing') return;

    const voice = voices.find(v => v.name === selectedVoice);
    if(utteranceRef.current) {
      if(voice) utteranceRef.current.voice = voice;
      utteranceRef.current.rate = playbackSpeed;
      utteranceRef.current.pitch = pitch;
    }

    const currentGlobalChar = currentCharIndex;
    stopSpeech();
    
    let sentenceIdx = sentenceCharStarts.current.findIndex(start => start > currentGlobalChar) - 1;
    if (sentenceIdx < -1) sentenceIdx = sentenceCharStarts.current.length - 1;
    if (sentenceIdx < 0) sentenceIdx = 0;
    
    const sentenceStartChar = sentenceCharStarts.current[sentenceIdx] || 0;
    const offsetInSentence = currentGlobalChar - sentenceStartChar;

    setTimeout(() => playSpeech(sentenceIdx, offsetInSentence), 100);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackSpeed, pitch, selectedVoice]);
  
  useEffect(() => {
    if (!book || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: book.title,
      artist: book.author,
      artwork: [{ src: book.coverImage, sizes: '300x400', type: 'image/png' }],
    });
    
    navigator.mediaSession.playbackState = playbackState === 'playing' ? 'playing' : 'paused';

    const playHandler = () => playSpeech();
    const pauseHandler = () => pauseSpeech();
    const rewindHandler = () => rewindSpeech();
    const ffHandler = () => fastForwardSpeech();
    const seekToHandler = (details: MediaSessionSeekToAction) => {
      if(details.seekTime && book && book.content.length > 0) {
          const totalDuration = book.content.length / 10; // Approximate duration
          const seekChar = Math.floor(details.seekTime / totalDuration * book.content.length);
          jumpTo(seekChar);
      }
    };

    navigator.mediaSession.setActionHandler('play', playHandler);
    navigator.mediaSession.setActionHandler('pause', pauseHandler);
    navigator.mediaSession.setActionHandler('seekbackward', rewindHandler);
    navigator.mediaSession.setActionHandler('seekforward', ffHandler);
    navigator.mediaSession.setActionHandler('seekto', seekToHandler);

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
      navigator.mediaSession.setActionHandler('seekto', null);
    };
  }, [book, playbackState, currentSentenceIndex, sentences, playbackSpeed, pitch, selectedVoice]);

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

    let charCounter = 0;
    
    return (
      <>
        {sentences.map((sentence, sIndex) => {
          const sStart = charCounter;
          const sEnd = charCounter + sentence.length;
          charCounter = sEnd;

          const isSpoken = currentSentence.start <= sStart && currentSentence.end > sStart;

          return (
            <span
              key={sIndex}
              onClick={() => jumpTo(sStart)}
              className={cn({
                'bg-accent/30 rounded sentence-highlight cursor-pointer': isSpoken,
                'cursor-pointer hover:bg-accent/10': !isSpoken && sentence.trim().length > 0,
              })}
            >
              {sentence}
            </span>
          );
        })}
      </>
    );
  };

  if (!book) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <BookText className="h-24 w-24 text-muted-foreground/50 mb-6" />
        <h2 className="font-headline text-2xl font-bold">Welcome to LinguaLecta</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          Select a book from your library to start reading, or import a new file to begin your audio journey.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background">
       <header className="p-4 border-b flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={onOpenLibrary} className="md:hidden">
                <Menu />
                <span className="sr-only">Open Library</span>
            </Button>
            <Button variant="ghost" onClick={onOpenLibrary} className="hidden md:flex">
                <ChevronLeft />
                Back to Library
            </Button>
        </div>
        <div className="text-center">
            <h2 className="font-semibold truncate max-w-[200px]">{book?.title}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={addBookmark}>
            <Bookmark />
            <span className="sr-only">Add Bookmark</span>
        </Button>
      </header>

      <ScrollArea className="flex-grow">
        <div className="max-w-6xl mx-auto p-6 lg:p-12">
          <div className={cn(
              "flex flex-col md:flex-row gap-8 lg:gap-12 items-start mb-8",
              {"md:flex-row-reverse": isCoverLandscape}
          )}>
            <Image
              src={book.coverImage}
              alt={`Cover of ${book.title}`}
              width={isCoverLandscape ? 400 : 300}
              height={isCoverLandscape ? 300 : 400}
              className={cn(
                "rounded-lg shadow-2xl object-cover mx-auto",
                isCoverLandscape ? "aspect-video" : "aspect-[3/4]"
              )}
              data-ai-hint="book cover"
            />
            <div className="pt-4 flex-1">
              <h1 className="font-headline text-4xl lg:text-5xl font-bold">{book.title}</h1>
              <p className="text-2xl text-muted-foreground mt-2">{book.author}</p>
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
              <article ref={contentRef} className="prose prose-4xl dark:prose-invert max-w-none text-foreground/90 leading-relaxed">
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
        <div className="max-w-4xl mx-auto flex items-center gap-6">
          <div className="flex items-center gap-6">
            <Button variant="ghost" size="lg" onClick={rewindSpeech} aria-label="Rewind 10 seconds" className="h-24 w-24">
              <Rewind className="h-12 w-12" />
            </Button>
            <Button size="lg" className="rounded-full w-32 h-32" onClick={handlePlayPauseClick} aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}>
              {playbackState === 'playing' ? <Pause className="h-16 w-16" /> : <Play className="h-16 w-16" />}
            </Button>
            <Button variant="ghost" size="lg" onClick={fastForwardSpeech} aria-label="Fast Forward 10 seconds" className="h-24 w-24">
              <FastForward className="h-12 w-12" />
            </Button>
          </div>
          <div className="flex-grow flex items-center gap-4">
              <Image src={book.coverImage} alt={book.title} width={56} height={56} className="rounded-md aspect-square object-cover" data-ai-hint="book cover" />
              <div className="w-full">
                  <p className="font-semibold truncate">{book.title}</p>
                  <Progress value={progress} className="h-2 mt-1" />
              </div>
          </div>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" className="h-24 w-24" aria-label="Playback Settings">
                <Settings2 className="h-12 w-12" />
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
        setBooks(mockBooks());
      }
    } catch (error) {
      console.error("Could not load books from local storage", error);
      setBooks(mockBooks());
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
  
  const generatePdfCover = async (pdf: pdfjsLib.PDFDocumentProxy): Promise<string> => {
    try {
      const page = await pdf.getPage(1);
      const viewport = page.getViewport({ scale: 1 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        return canvas.toDataURL();
      }
    } catch (error) {
      console.error('Failed to generate PDF cover:', error);
    }
    // Return a local or data URI fallback
    const fallbackCanvas = document.createElement('canvas');
    fallbackCanvas.width = 300;
    fallbackCanvas.height = 400;
    const ctx = fallbackCanvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#f5f5dc'; // beige
        ctx.fillRect(0, 0, 300, 400);
        ctx.fillStyle = '#a0522d'; // sienna
        ctx.font = '24px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No Cover', 150, 200);
    }
    return fallbackCanvas.toDataURL();
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
          const fallbackCover = (() => {
                const fallbackCanvas = document.createElement('canvas');
                fallbackCanvas.width = 300;
                fallbackCanvas.height = 400;
                const ctx = fallbackCanvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = '#f5f5dc'; // beige
                    ctx.fillRect(0, 0, 300, 400);
                    ctx.fillStyle = '#a0522d'; // sienna
                    ctx.font = '24px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText('No Cover', 150, 200);
                }
                return fallbackCanvas.toDataURL();
            })();
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
        <SheetContent side="left" className="p-0 w-full sm:max-w-xs flex flex-col md:hidden">
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

      <aside className={cn(
        "w-1/3 max-w-sm xl:max-w-md flex-col border-r h-full flex-shrink-0",
        "transition-all duration-300 ease-in-out",
        "hidden md:flex",
        selectedBook ? "md:-ml-[33.333333%] md:opacity-0" : "md:ml-0 md:opacity-100"
      )}>
         <LibraryContent
            books={books}
            onSelectBook={handleSelectBook}
            onRename={handleRenameRequest}
            onDelete={handleDeleteRequest}
            onImportClick={() => fileInputRef.current?.click()}
            isLoading={isLoading}
        />
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileImport} accept=".pdf,.txt"/>
      </aside>

      <main className={cn(
        "flex-1 h-full transition-all duration-300 ease-in-out",
        selectedBook ? "w-full" : "md:w-2/3"
        )}>
        <ReaderView 
          book={selectedBook} 
          onOpenLibrary={() => {
            setSelectedBook(null);
            if(!selectedBook){
                setIsLibraryOpen(true);
            }
          }} 
          onUpdateBook={handleUpdateBook} 
        />
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
