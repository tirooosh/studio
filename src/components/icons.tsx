"use client"

import { Book, File as FileIcon, FileText, BookOpen, BookText } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

export function Logo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
      <path d="M16 8a2 2 0 0 1-2 2H8" />
      <path d="M12 12a2 2 0 1 1-4 0" />
      <path d="M16 16a2 2 0 0 0-2-2h-4" />
    </svg>
  );
}

const fileTypeMap = {
  PDF: { icon: FileText, color: "bg-red-200 text-red-800" },
  EPUB: { icon: BookOpen, color: "bg-blue-200 text-blue-800" },
  MOBI: { icon: BookOpen, color: "bg-orange-200 text-orange-800" },
  DOCX: { icon: FileText, color: "bg-sky-200 text-sky-800" },
  TXT: { icon: FileIcon, color: "bg-gray-200 text-gray-800" },
};

export function FileTypeIcon({ fileType, className }: { fileType: keyof typeof fileTypeMap, className?: string }) {
  const { icon: Icon, color } = fileTypeMap[fileType] || fileTypeMap.TXT;
  return (
    <Badge variant="outline" className={cn("flex items-center gap-1.5 border-none", color, className)}>
      <Icon className="h-3.5 w-3.5" />
      <span>{fileType}</span>
    </Badge>
  );
}