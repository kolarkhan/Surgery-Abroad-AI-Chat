"use client";

import { useRef } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import TooltipButton from "./TooltipButton";

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  files?: File[];
  disabled?: boolean;
  maxFiles?: number;
  acceptedTypes?: string[];
}

export default function FileUpload({
  onFilesChange,
  files = [],
  disabled = false,
  maxFiles = 5,
  acceptedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ],
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const incomingFiles = Array.from(event.target.files || []);
    const validFiles = incomingFiles.filter((file) =>
      acceptedTypes.includes(file.type)
    );

    if (validFiles.length !== incomingFiles.length) {
      alert("Some files were not added because they are not supported file formats.");
    }

    const limitedFiles = validFiles.slice(0, maxFiles - files.length);

    if (limitedFiles.length !== validFiles.length) {
      alert(
        `Maximum ${maxFiles} files allowed. Only the first ${limitedFiles.length} files were added.`
      );
    }

    onFilesChange([...files, ...limitedFiles]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileSelect = () => {
    if (!disabled && files.length < maxFiles) {
      fileInputRef.current?.click();
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedTypes.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <TooltipButton text={`Upload files (${files.length}/${maxFiles})`}>
        <Button
          type="button"
          onClick={triggerFileSelect}
          variant="ghost"
          size="icon"
          className="h-11 w-11 rounded-2xl border border-white/70 bg-white/70 text-slate-700 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white"
          disabled={disabled || files.length >= maxFiles}
        >
          <Plus size={18} />
        </Button>
      </TooltipButton>
    </>
  );
}
