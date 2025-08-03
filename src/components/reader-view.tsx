
"use client";

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import {
  Pause,
  Play,
  Settings2,
  Bookmark,
  Trash2,
  ChevronLeft,
  Download,
} from 'lucide-react';

import type { Book, Bookmark as BookmarkType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from "@/hooks/use-toast";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileTypeIcon } from '@/components/icons';
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
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: Array<string>;
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed',
    platform: string,
  }>;
  prompt(): Promise<void>;
}

export function ReaderView({ 
  book, 
  onOpenLibrary,
  onUpdateBook,
  isDarkMode,
  toggleDarkMode,
  fontSize,
  setFontSize,
  installPrompt,
  onInstall,
}: { 
  book: Book | null, 
  onOpenLibrary: () => void,
  onUpdateBook: (book: Book) => void,
  isDarkMode: boolean,
  toggleDarkMode: (checked: boolean) => void,
  fontSize: number,
  setFontSize: (size: number) => void,
  installPrompt: BeforeInstallPromptEvent | null;
  onInstall: () => void;
}) {
  const [playbackState, setPlaybackState] = useState<'playing' | 'paused' | 'stopped'>('stopped');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [pitch, setPitch] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const sentences = book?.content.match(/[^.!?\n]+[.!?\n]*/g) || [];
  const sentenceCharStarts = useRef<number[]>([]);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
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


  const stopSpeech = () => {
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.cancel();
    }
    setPlaybackState('stopped');
    utteranceRef.current = null;
  }

  const handlePlayback = (action: 'play' | 'pause' | 'jump', payload?: any) => {
    if (!book) return;

    if (action === 'pause') {
        if(speechSynthesis.speaking) speechSynthesis.pause();
        setPlaybackState('paused');
    } else if (action === 'play') {
        if (speechSynthesis.paused) {
            speechSynthesis.resume();
            setPlaybackState('playing');
        } else {
            const startSentence = currentSentenceIndex;
            const charOffset = currentCharIndex - (sentenceCharStarts.current[startSentence] || 0);
            playSentence(startSentence, charOffset);
        }
    } else if (action === 'jump') {
        const charIndex = payload?.charIndex ?? 0;
        const shouldPlay = payload?.andPlay ?? false;
        
        let sentenceIdx = sentenceCharStarts.current.findIndex(start => start > charIndex) - 1;
        if (sentenceIdx < -1) sentenceIdx = sentenceCharStarts.current.length - 1;
        if (sentenceIdx < 0) sentenceIdx = 0;
        
        setCurrentCharIndex(charIndex);
        setCurrentSentenceIndex(sentenceIdx);

        if (book.content.length > 0) {
            setProgress((charIndex / book.content.length) * 100);
        }

        if (shouldPlay) {
            stopSpeech();
            playSentence(sentenceIdx);
        } else {
            // Even if not playing, stop current speech if jumping
            stopSpeech();
        }
    }
  };


  const playSentence = (sentenceIdx: number, startCharInSentence: number = 0) => {
    if (!book || sentenceIdx >= sentences.length) {
        setPlaybackState('stopped');
        return;
    }
    
    const currentSentenceText = sentences[sentenceIdx] || '';
    if (!currentSentenceText || !currentSentenceText.trim()) {
        const nextIndex = sentenceIdx + 1;
        if(nextIndex < sentences.length){
            setCurrentSentenceIndex(nextIndex);
            playSentence(nextIndex);
        } else {
            setPlaybackState('stopped');
        }
        return;
    };
    
    const utterance = new SpeechSynthesisUtterance(currentSentenceText);
    const voice = voices.find(v => v.name === selectedVoice);
    if (voice) utterance.voice = voice;
    utterance.rate = playbackSpeed;
    utterance.pitch = pitch;

    const sentenceStartChar = sentenceCharStarts.current[sentenceIdx] || 0;
    
    utterance.onstart = () => {
        setPlaybackState('playing');
        setCurrentSentenceIndex(sentenceIdx);
    };

    utterance.onboundary = (event) => {
      const newCharIndex = sentenceStartChar + event.charIndex;
      setCurrentCharIndex(newCharIndex);
      if (book.content.length > 0) {
        setProgress((newCharIndex / book.content.length) * 100);
      }
    };

    utterance.onend = () => {
      const nextSentenceIndex = sentenceIdx + 1;
      if (nextSentenceIndex < sentences.length) {
          playSentence(nextSentenceIndex);
      } else {
          setPlaybackState('stopped');
          setProgress(100);
          setCurrentCharIndex(book.content.length);
          utteranceRef.current = null;
      }
    };
    
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
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    const cleanup = () => {
        window.speechSynthesis.onvoiceschanged = null;
        stopSpeech();
    };
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (contentRef.current && currentSentenceIndex < sentences.length) {
      const highlightElement = contentRef.current.querySelector('.sentence-highlight');
      if (highlightElement) {
        highlightElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentSentenceIndex, sentences.length]);
  
  useEffect(() => {
    const cleanup = () => stopSpeech();
    if (!book) {
      setProgress(0);
      setCurrentCharIndex(0);
      setCurrentSentenceIndex(0);
      return cleanup;
    };
    
    let startChar = 0;
    if (book.bookmarks && book.bookmarks.length > 0) {
        const latestBookmark = book.bookmarks.reduce((latest, current) => {
            return new Date(latest.createdAt) > new Date(current.createdAt) ? latest : current;
        });
        startChar = latestBookmark.charIndex;
    }
    
    handlePlayback('jump', { charIndex: startChar, andPlay: false });
    
    return cleanup;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book]);

  useEffect(() => {
      if (playbackState !== 'playing' || !book || !utteranceRef.current) return;

      const charOffset = currentCharIndex - (sentenceCharStarts.current[currentSentenceIndex] || 0);

      stopSpeech();
      // Use timeout to allow synth to clear queue
      setTimeout(() => {
          playSentence(currentSentenceIndex, charOffset);
      }, 50);

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

    const playHandler = () => handlePlayback(playbackState === 'paused' ? 'play' : 'pause');
    const pauseHandler = () => handlePlayback('pause');

    navigator.mediaSession.setActionHandler('play', playHandler);
    navigator.mediaSession.setActionHandler('pause', pauseHandler);
    navigator.mediaSession.setActionHandler('seekbackward', () => {
       const newCharIndex = Math.max(0, currentCharIndex - 100);
       handlePlayback('jump', { charIndex: newCharIndex, andPlay: playbackState === 'playing' });
    });
    navigator.mediaSession.setActionHandler('seekforward', () => {
       const newCharIndex = Math.min(book.content.length - 1, currentCharIndex + 100);
       handlePlayback('jump', { charIndex: newCharIndex, andPlay: playbackState === 'playing' });
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
          charCounter += sentence.length;
          
          const isSpoken = sIndex === currentSentenceIndex && playbackState !== 'stopped';

          return (
            <span
              key={sIndex}
              onClick={() => handlePlayback('jump', { charIndex: sStart, andPlay: true })}
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
              src={book?.coverImage || ''}
              alt={`Cover of ${book?.title}`}
              width={isCoverLandscape ? 400 : 300}
              height={isCoverLandscape ? 300 : 400}
              className={cn(
                "rounded-lg shadow-2xl object-cover mx-auto w-48 md:w-64 flex-shrink-0",
                isCoverLandscape ? "aspect-video" : "aspect-[3/4]"
              )}
              data-ai-hint="book cover"
            />
            <div className="pt-2 md:pt-4 flex-1">
              <h1 className="font-headline text-2xl md:text-4xl lg:text-5xl font-bold">{book?.title}</h1>
              <p className="text-lg md:text-2xl text-muted-foreground mt-2">{book?.author}</p>
              <div className="flex items-center justify-between mt-4">
                <FileTypeIcon fileType={book?.fileType || 'TXT'} />
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
                Bookmarks <span className="ml-2 bg-muted text-muted-foreground rounded-full px-2 text-xs">{book?.bookmarks?.length || 0}</span>
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
              {book?.bookmarks && book.bookmarks.length > 0 ? (
                <div className="space-y-4">
                  {book.bookmarks.map(b => (
                    <Card key={b.id} className="overflow-hidden">
                      <CardContent className="p-4 flex items-center justify-between gap-4">
                        <div className="flex-grow">
                          <p className="text-sm font-medium text-muted-foreground">Added on {b.createdAt}</p>
                          <blockquote className="text-sm italic border-l-2 pl-2 mt-1">"{b.previewText}"</blockquote>
                        </div>
                        <div className="flex-shrink-0 flex gap-2">
                           <Button size="sm" variant="outline" onClick={() => handlePlayback('jump', { charIndex: b.charIndex, andPlay: true })}>
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

          <Button size="lg" className="rounded-full w-16 h-16 md:w-20 md:h-20" onClick={() => handlePlayback(playbackState === 'playing' ? 'pause' : 'play')} aria-label={playbackState === 'playing' ? 'Pause' : 'Play'}>
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
        </div>
      </div>
    </div>
  );
}
