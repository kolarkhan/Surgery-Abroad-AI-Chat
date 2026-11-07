"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Image as ImageIcon } from "lucide-react";

interface FileAttachmentProps {
  fileId: string;
  fileName: string;
  fileType?: string;
  url?: string;
}

export default function FileAttachment({ fileName, fileType, url }: FileAttachmentProps) {
  const [preview, setPreview] = useState(false);
  const isImage = fileType?.startsWith("image/");

  return (
    <div className="relative bg-white rounded shadow p-2 w-32 text-xs">
      <div className="truncate font-medium">{fileName}</div>
      {isImage ? (
        <div className="mt-1">
          <ImageIcon size={14} className="inline mr-1" />
          Image
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 text-blue-600"
            onClick={() => setPreview(true)}
          >
            <Eye size={14} />
          </Button>
        </div>
      ) : (
        <div className="mt-1 text-gray-600">
          <FileText size={14} className="inline mr-1" />
          File
        </div>
      )}

      {preview && url && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setPreview(false)}
        >
          <img src={url} alt="Preview" className="max-w-full max-h-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
