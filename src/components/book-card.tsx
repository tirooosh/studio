
"use client"

import Image from 'next/image';
import { MoreVertical } from 'lucide-react';
import type { Book } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { FileTypeIcon } from '@/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BookCardProps {
  book: Book;
  onSelectBook: (book: Book) => void;
  onRename: (book: Book) => void;
  onDelete: (book: Book) => void;
}

export function BookCard({ book, onSelectBook, onRename, onDelete }: BookCardProps) {
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
