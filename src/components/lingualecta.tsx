

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
  Loader,
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
import { Switch } from "@/components/ui/switch";


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
  isDarkMode,
  toggleDarkMode,
  fontSize,
  setFontSize,
}: { 
  book: Book | null, 
  onOpenLibrary: () => void,
  onUpdateBook: (book: Book) => void,
  isDarkMode: boolean,
  toggleDarkMode: (checked: boolean) => void,
  fontSize: number,
  setFontSize: (size: number) => void,
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
  
  const sentences = book?.content.match(/[^.!?\n]+[.!?\n]*/g) || [];
  const sentenceCharStarts = useRef<number[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [isCoverLandscape, setIsCoverLandscape] = useState(false);
  
  useEffect(() => {
    let charCount = 0;
    const starts = sentences.map(s => {
        const start = charCount;
        charCount += s.length;
        return start;
    });
    sentenceCharStarts.current = starts;
  }, [sentences]);

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
        
        const calmingVoice = availableVoices.find(v => v.name === 'Google UK English Male') || 
                             availableVoices.find(v => v.name.includes('Zira')) ||
                             englishVoices.find(v => v.name.toLowerCase().includes('male'));

        let defaultVoice = calmingVoice || englishVoices[0] || availableVoices[0];
        
        setSelectedVoice(defaultVoice?.name);
      }
    };
    
    if(window.speechSynthesis.getVoices().length > 0) {
        loadVoices();
    } else {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    const cleanup = () => {
        window.speechSynthesis.onvoiceschanged = null;
        stopSpeech();
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

  const jumpTo = (charIndex: number, andPlay = false) => {
    if (!book || !sentences.length) return;
    
    stopSpeech();
    
    const clampedIndex = Math.max(0, Math.min(charIndex, book.content.length - 1));
    
    let sentenceIdx = sentenceCharStarts.current.findIndex(start => start > clampedIndex) - 1;
    if (sentenceIdx < -1) sentenceIdx = sentenceCharStarts.current.length - 1;
    if (sentenceIdx < 0) sentenceIdx = 0;
    
    const sentenceStartChar = sentenceCharStarts.current[sentenceIdx];
    
    setCurrentCharIndex(clampedIndex);
    setCurrentSentenceIndex(sentenceIdx);
    setCurrentSentence({start: sentenceStartChar, end: sentenceStartChar + (sentences[sentenceIdx]?.length || 0)});
    if(book.content.length > 0) {
        setProgress((clampedIndex / book.content.length) * 100);
    }

    if(andPlay){
        const offsetInSentence = clampedIndex - sentenceStartChar;
        playSpeech(sentenceIdx, offsetInSentence);
    }
  }
  
  const playSpeech = (startSentence?: number, startCharInSentence?: number) => {
    if (playbackState === 'playing') return;
    
    stopSpeech();

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

  const handlePlayPauseClick = () => {
    if (playbackState === 'playing') {
      pauseSpeech();
    } else if (playbackState === 'paused') {
        playSpeech();
    } else {
      playSpeech(currentSentenceIndex, currentCharIndex - (sentenceCharStarts.current[currentSentenceIndex] || 0));
    }
  };

  const setupUtterance = async (sentenceIdx: number, startCharInSentence: number = 0) => {
    if (!book || sentenceIdx >= sentences.length) {
        setPlaybackState('stopped');
        return;
    }
    
    const currentSentenceText = sentences[sentenceIdx] || '';
    if (!currentSentenceText || !currentSentenceText.trim()) {
        const nextIndex = sentenceIdx + 1;
        if(nextIndex < sentences.length){
            setCurrentSentenceIndex(nextIndex);
            setupUtterance(nextIndex, 0);
        } else {
            setPlaybackState('stopped');
        }
        return;
    };
    
    const sentenceStartChar = sentenceCharStarts.current[sentenceIdx] || 0;
    setCurrentSentence({start: sentenceStartChar, end: sentenceStartChar + currentSentenceText.length});
    setCurrentCharIndex(sentenceStartChar);

    const utterance = new SpeechSynthesisUtterance(currentSentenceText);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = playbackSpeed;
    utterance.pitch = pitch;

    let charIndex = sentenceStartChar;
    utterance.onboundary = (event) => {
      charIndex = sentenceStartChar + event.charIndex;
      setCurrentCharIndex(charIndex);
      if (book.content.length > 0) {
        setProgress((charIndex / book.content.length) * 100);
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
          setCurrentCharIndex(book.content.length);
          utteranceRef.current = null;
      }
    };
    
    utterance.onstart = () => {
        setPlaybackState('playing');
    }

    utterance.onerror = (event) => {
        if (event.error === 'interrupted' || event.error === 'canceled') return;
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
    const cleanup = () => {
      stopSpeech();
    };

    if (!book) {
      setProgress(0);
      setCurrentCharIndex(0);
      return cleanup;
    };
    
    let startChar = 0;
    if (book.bookmarks && book.bookmarks.length > 0) {
        const latestBookmark = book.bookmarks.reduce((latest, current) => {
            return new Date(latest.createdAt) > new Date(current.createdAt) ? latest : current;
        });
        startChar = latestBookmark.charIndex;
    }
    
    jumpTo(startChar);
    
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  useEffect(() => {
    if (playbackState !== 'playing' || !book) return;

    if (utteranceRef.current) {
      const charOffset = currentCharIndex - (sentenceCharStarts.current[currentSentenceIndex] || 0);

      stopSpeech();
      // A brief timeout allows the speech synthesizer to clear its queue.
      setTimeout(() => {
        // We call playSpeech with the current sentence index to resume correctly.
        playSpeech(currentSentenceIndex, charOffset);
      }, 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playbackSpeed, pitch]);
  
  useEffect(() => {
    // When the selected voice changes, stop any current playback
    // and let the user restart it with the new voice.
    stopSpeech();
  }, [selectedVoice]);
  
  useEffect(() => {
    if (!book || !('mediaSession' in navigator)) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: book.title,
      artist: book.author,
      artwork: [{ src: book.coverImage, sizes: '300x400', type: 'image/png' }],
    });
    
    navigator.mediaSession.playbackState = playbackState === 'playing' ? 'playing' : 'paused';

    const playHandler = () => handlePlayPauseClick();
    const pauseHandler = () => handlePlayPauseClick();

    navigator.mediaSession.setActionHandler('play', playHandler);
    navigator.mediaSession.setActionHandler('pause', pauseHandler);
    navigator.mediaSession.setActionHandler('seekbackward', () => {
       const newCharIndex = Math.max(0, currentCharIndex - 100);
       jumpTo(newCharIndex, playbackState === 'playing');
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
       const newCharIndex = Math.min(book.content.length - 1, currentCharIndex + 100);
       jumpTo(newCharIndex, playbackState === 'playing');
    });

    return () => {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
      navigator.mediaSession.setActionHandler('seekbackward', null);
      navigator.mediaSession.setActionHandler('seekforward', null);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book, playbackState, currentSentenceIndex, sentences, playbackSpeed, pitch, selectedVoice, currentCharIndex]);

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
              onClick={() => jumpTo(sStart, true)}
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
    <div className="flex flex-col h-dvh bg-background">
       <header className="p-4 border-b flex items-center justify-between bg-card/80 backdrop-blur-sm sticky top-0 z-10 h-20 md:h-24">
        <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onOpenLibrary} className="flex items-center text-base p-2 -ml-2 md:p-4">
                <ChevronLeft className="h-6 w-6 md:h-7 md:w-7 mr-1" />
                <span className="hidden md:inline text-lg">Back to Library</span>
            </Button>
        </div>
        <div className="text-center">
            <h2 className="font-semibold truncate max-w-[200px] md:max-w-md text-base md:text-xl">{book?.title}</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={addBookmark} className="h-12 w-12 md:h-14 md:w-14">
            <Bookmark className="h-6 w-6 md:h-7 md:w-7"/>
            <span className="sr-only">Add Bookmark</span>
        </Button>
      </header>

      <ScrollArea className="flex-grow">
        <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-12">
          <div className={cn(
              "flex flex-col md:flex-row gap-6 md:gap-8 lg:gap-12 items-start mb-8",
              {"md:flex-row-reverse": isCoverLandscape}
          )}>
            <Image
              src={book.coverImage}
              alt={`Cover of ${book.title}`}
              width={isCoverLandscape ? 400 : 300}
              height={isCoverLandscape ? 300 : 400}
              className={cn(
                "rounded-lg shadow-2xl object-cover mx-auto w-48 md:w-64 flex-shrink-0",
                isCoverLandscape ? "aspect-video" : "aspect-[3/4]"
              )}
              data-ai-hint="book cover"
            />
            <div className="pt-2 md:pt-4 flex-1">
              <h1 className="font-headline text-2xl md:text-4xl lg:text-5xl font-bold">{book.title}</h1>
              <p className="text-lg md:text-2xl text-muted-foreground mt-2">{book.author}</p>
              <div className="flex items-center justify-between mt-4">
                <FileTypeIcon fileType={book.fileType} />
                <Button variant="outline" onClick={addBookmark} className="hidden md:flex">
                    <Bookmark className="mr-2 h-4 w-4"/> Add Bookmark
                </Button>
              </div>
            </div>
          </div>
          
          <Separator className="my-6 md:my-8" />
          
          <Tabs defaultValue="content">
            <TabsList className="mb-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="bookmarks">
                Bookmarks <span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 text-xs">{book.bookmarks?.length || 0}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="content">
              <article 
                ref={contentRef} 
                className="prose dark:prose-invert max-w-none text-foreground/90 leading-relaxed text-base md:text-lg"
                style={{ fontSize: `${fontSize}%` }}
              >
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
                           <Button size="sm" variant="outline" onClick={() => jumpTo(b.charIndex, true)}>
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
      <div className="p-4 border-t bg-card/80 backdrop-blur-sm sticky bottom-0 h-28 flex flex-col justify-center">
        <div className="w-full flex items-center justify-center mb-2 px-4">
            <Progress value={progress} className="h-2 w-full max-w-lg" />
        </div>
        <div className="max-w-lg mx-auto flex items-center justify-around gap-2 w-full">
          <Button variant="ghost" size="icon" className="h-16 w-16 md:h-20 md:w-20" aria-label="Add Bookmark" onClick={addBookmark}>
            <Bookmark className="h-7 w-7 md:h-8 md:w-8" />
          </Button>

          <Button size="lg" className="rounded-full w-16 h-16 md:w-20 md:h-20" onClick={handlePlayPauseClick} aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}>
            {playbackState === 'playing' ? <Pause className="h-8 w-8 md:h-10 md:w-10" /> : <Play className="h-8 w-8 md:h-10 md:w-10" />}
          </Button>
            
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="h-16 w-16 md:h-20 md:w-20" aria-label="Playback Settings">
                <Settings2 className="h-7 w-7 md:h-8 md:w-8" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-6">
              <div className="grid gap-6">
                <div className="space-y-2">
                  <h4 className="font-medium leading-none font-headline text-lg">Playback Settings</h4>
                  <p className="text-base text-muted-foreground">
                    Customize your listening experience.
                  </p>
                </div>
                <div className="grid gap-4 text-base">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="dark-mode-switch" className="text-lg">Dark Mode</Label>
                    <Switch id="dark-mode-switch" checked={isDarkMode} onCheckedChange={toggleDarkMode} />
                  </div>
                  <Separator />
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="font-size-slider" className="text-lg">Font Size ({fontSize}%)</Label>
                    <Slider id="font-size-slider" min={50} max={200} step={10} value={[fontSize]} onValueChange={([val]) => setFontSize(val)} />
                  </div>
                   <Separator />
                  <Label htmlFor="voice-select" className="text-lg">Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger id="voice-select" className="text-base">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {voices.map(voice => (
                        <SelectItem key={voice.name} value={voice.name} className="text-base">{voice.name} ({voice.lang})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="grid gap-2 mt-2">
                    <Label htmlFor="speed-slider" className="text-lg">Speed ({playbackSpeed.toFixed(1)}x)</Label>
                    <Slider id="speed-slider" min={0.5} max={3} step={0.1} value={[playbackSpeed]} onValueChange={([val]) => setPlaybackSpeed(val)} />
                  </div>
                  <div className="grid gap-2 mt-2">
                      <Label htmlFor="pitch-slider" className="text-lg">Pitch ({pitch.toFixed(1)})</Label>
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
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 md:gap-6 p-4 md:p-6">
    {Array.from({ length: 12 }).map((_, i) => (
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

const AppSettings = ({ isDarkMode, toggleDarkMode }: { isDarkMode: boolean; toggleDarkMode: (checked: boolean) => void }) => {
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
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
};


const LibraryView = ({ books, onSelectBook, onRename, onDelete, onImportClick, isLoading, isDarkMode, toggleDarkMode }: { books: Book[], onSelectBook: (book: Book) => void, onRename: (book: Book) => void, onDelete: (book: Book) => void, onImportClick: () => void, isLoading: boolean, isDarkMode: boolean, toggleDarkMode: (checked: boolean) => void }) => (
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
        <AppSettings isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
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
            />
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileImport} accept=".pdf,.txt"/>
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


    



