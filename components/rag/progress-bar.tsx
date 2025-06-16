'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { ProcessingStage, ProcessingStatus } from '@/lib/rag/progress/types';

interface ProgressBarProps {
  stage: ProcessingStage;
  progress: number;
  status: ProcessingStatus;
  animated?: boolean;
  showLabels?: boolean;
  className?: string;
}

const stageLabels: Record<ProcessingStage, string> = {
  upload: 'Uploading',
  parsing: 'Parsing',
  chunking: 'Chunking',
  embedding: 'Embedding',
  storing: 'Storing',
  completed: 'Complete',
  error: 'Failed'
};

const stageOrder: ProcessingStage[] = [
  'upload',
  'parsing', 
  'chunking',
  'embedding',
  'storing',
  'completed'
];

export function ProgressBar({
  stage,
  progress,
  status,
  animated = false,
  showLabels = true,
  className
}: ProgressBarProps) {
  const currentStageIndex = stageOrder.indexOf(stage);
  const isError = status === 'failed' || stage === 'error';
  
  const getStageStatus = (stageIndex: number) => {
    if (isError && stageIndex === currentStageIndex) {
      return 'error';
    }
    if (stageIndex < currentStageIndex) {
      return 'completed';
    }
    if (stageIndex === currentStageIndex) {
      return status === 'completed' ? 'completed' : 'active';
    }
    return 'pending';
  };

  return (
    <div className={cn('space-y-3', className)}>
      {/* Progress Bar */}
      <div className="relative">
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-300',
              {
                'bg-primary': !isError,
                'bg-destructive': isError,
                'animate-pulse': animated && status === 'processing'
              }
            )}
            style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Processing progress: ${progress}%`}
          />
        </div>
        
        <div className="flex justify-between items-center mt-1">
          <span className="text-sm font-medium text-foreground">
            {stageLabels[stage]}
          </span>
          <span className="text-sm text-muted-foreground">
            {progress}%
          </span>
        </div>
      </div>

      {/* Stage Indicators */}
      {showLabels && (
        <div className="flex justify-between relative">
          {/* Connection Line */}
          <div className="absolute top-2 left-0 right-0 h-0.5 bg-muted" />
          
          {stageOrder.slice(0, -1).map((stageName, index) => {
            const stageStatus = getStageStatus(index);
            const isActive = index === currentStageIndex;
            
            return (
              <div
                key={stageName}
                className="relative flex flex-col items-center z-10"
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full border-2 transition-all duration-200',
                    {
                      'bg-primary border-primary': stageStatus === 'completed',
                      'bg-primary border-primary animate-pulse': 
                        stageStatus === 'active' && status === 'processing',
                      'bg-background border-primary': 
                        stageStatus === 'active' && status !== 'processing',
                      'bg-destructive border-destructive': stageStatus === 'error',
                      'bg-background border-muted-foreground': stageStatus === 'pending'
                    }
                  )}
                  role="button"
                  aria-label={`${stageLabels[stageName]} - ${stageStatus}`}
                />
                <span
                  className={cn(
                    'text-xs mt-1 font-medium transition-colors duration-200 text-center max-w-16',
                    {
                      'text-primary': stageStatus === 'completed' || stageStatus === 'active',
                      'text-destructive': stageStatus === 'error',
                      'text-muted-foreground': stageStatus === 'pending'
                    }
                  )}
                >
                  {stageLabels[stageName]}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}