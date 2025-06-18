'use client';

import React, { useCallback, useState, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, File, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateFile, detectFileType } from '@/lib/rag/validation';
import type { SupportedFileType } from '@/lib/rag/validation';

export interface UploadFile {
  id: string;
  file: File;
  type: SupportedFileType;
  preview?: string;
  error?: string;
}

interface DocumentUploadZoneProps {
  onFilesSelected: (files: UploadFile[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

export function DocumentUploadZone({
  onFilesSelected,
  disabled = false,
  maxFiles = 10,
  className,
}: DocumentUploadZoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<UploadFile[]>([]);
  const fileIdCounter = useRef(0);

  const generateFileId = useCallback((fileName: string) => {
    fileIdCounter.current += 1;
    return `${fileName}-${fileIdCounter.current}`;
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      const newFiles: UploadFile[] = [];

      // Process accepted files
      acceptedFiles.forEach((file) => {
        const validation = validateFile(file);
        const fileType = detectFileType(file);

        const uploadFile: UploadFile = {
          id: generateFileId(file.name),
          file,
          type: fileType,
          error: validation.success ? undefined : validation.error,
        };

        // Generate preview for small files
        if (file.size < 1024 * 100) {
          // 100KB limit for preview
          const reader = new FileReader();
          reader.onload = (e) => {
            const content = e.target?.result as string;
            uploadFile.preview =
              content.slice(0, 200) + (content.length > 200 ? '...' : '');
          };
          reader.readAsText(file);
        }

        newFiles.push(uploadFile);
      });

      // Process rejected files
      rejectedFiles.forEach((rejected) => {
        const uploadFile: UploadFile = {
          id: generateFileId(rejected.file.name),
          file: rejected.file,
          type: 'markdown', // default
          error:
            rejected.errors?.map((e: any) => e.message).join(', ') ||
            'File rejected',
        };
        newFiles.push(uploadFile);
      });

      const updatedFiles = [...selectedFiles, ...newFiles].slice(0, maxFiles);
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    },
    [selectedFiles, onFilesSelected, maxFiles, generateFileId],
  );

  const removeFile = useCallback(
    (fileId: string) => {
      const updatedFiles = selectedFiles.filter((f) => f.id !== fileId);
      setSelectedFiles(updatedFiles);
      onFilesSelected(updatedFiles);
    },
    [selectedFiles, onFilesSelected],
  );

  const clearAll = useCallback(() => {
    setSelectedFiles([]);
    onFilesSelected([]);
  }, [onFilesSelected]);

  const {
    getRootProps,
    getInputProps,
    isDragActive,
    isDragAccept,
    isDragReject,
  } = useDropzone({
    onDrop,
    accept: {
      'text/markdown': ['.md', '.markdown'],
      'text/plain': ['.md', '.markdown'], // Some systems detect .md as plain text
      'application/json': ['.json'],
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    maxFiles,
    disabled,
    multiple: true,
  });

  const dropzoneClassName = cn(
    'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
    'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
    {
      'border-primary bg-primary/5': isDragAccept,
      'border-destructive bg-destructive/5': isDragReject,
      'border-muted-foreground/25': !isDragActive,
      'cursor-not-allowed opacity-50': disabled,
    },
    className,
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-0">
          <div
            {...getRootProps()}
            className={dropzoneClassName}
            role="button"
            tabIndex={0}
            aria-label={
              isDragActive
                ? 'Drop files here'
                : 'Click to select files or drag and drop'
            }
          >
            <input {...getInputProps()} aria-describedby="upload-description" />

            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-muted">
                <Upload size={24} />
              </div>

              {isDragActive ? (
                <div>
                  <p className="text-lg font-medium">
                    {isDragAccept ? 'Drop files here' : 'Unsupported file type'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {isDragAccept
                      ? 'Release to upload'
                      : 'Only .md and .json files are supported'}
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium">
                    Drag & drop files here, or click to select
                  </p>
                  <p
                    className="text-sm text-muted-foreground"
                    id="upload-description"
                  >
                    Supports Markdown (.md) and JSON (.json) files up to 50MB
                    each
                  </p>
                </div>
              )}

              <Button variant="outline" disabled={disabled} type="button">
                Select Files
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">
                Selected Files ({selectedFiles.length}/{maxFiles})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={disabled}
              >
                Clear All
              </Button>
            </div>

            <div className="space-y-3">
              {selectedFiles.map((uploadFile) => (
                <FilePreviewCard
                  key={uploadFile.id}
                  uploadFile={uploadFile}
                  onRemove={() => removeFile(uploadFile.id)}
                  disabled={disabled}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface FilePreviewCardProps {
  uploadFile: UploadFile;
  onRemove: () => void;
  disabled?: boolean;
}

function FilePreviewCard({
  uploadFile,
  onRemove,
  disabled,
}: FilePreviewCardProps) {
  const { file, type, preview, error } = uploadFile;

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 border rounded-lg',
        error ? 'border-destructive bg-destructive/5' : 'border-border',
      )}
    >
      <div className="flex-shrink-0 p-2 rounded bg-muted">
        <File size={16} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-sm truncate">{file.name}</h4>
          <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
            {type.toUpperCase()}
          </span>
        </div>

        <p className="text-xs text-muted-foreground mb-2">
          {formatFileSize(file.size)} • {file.type || 'Unknown type'}
        </p>

        {error && (
          <p className="text-xs text-destructive mb-2" role="alert">
            {error}
          </p>
        )}

        {preview && !error && (
          <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 font-mono">
            {preview}
          </div>
        )}
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={onRemove}
        disabled={disabled}
        className="h-8 w-8 p-0 hover:bg-destructive/10"
        aria-label={`Remove ${file.name}`}
      >
        <X size={16} />
      </Button>
    </div>
  );
}
