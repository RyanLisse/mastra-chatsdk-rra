'use client';

import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCwIcon, Sparkles } from 'lucide-react';
import { useSidebar } from './ui/sidebar';
import { memo } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { type VisibilityType, VisibilitySelector } from './visibility-selector';
import type { Session } from 'next-auth';
import { motion } from 'framer-motion';

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  session,
  onResetSession,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  session: Session;
  onResetSession?: () => void;
}) {
  const router = useRouter();
  const { open } = useSidebar();

  const { width: windowWidth } = useWindowSize();

  return (
    <motion.header
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex sticky top-0 bg-background/95 backdrop-blur-sm border-b py-2 items-center px-2 md:px-4 gap-3 z-40"
    >
      <SidebarToggle />

      {/* Brand/Logo Section */}
      {(!open || windowWidth < 768) && (
        <div className="flex items-center gap-2 mr-2">
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-primary"
          >
            <Sparkles size={20} />
            <span className="font-semibold text-lg hidden sm:inline">
              Mastra Chat
            </span>
          </motion.div>
        </div>
      )}

      {(!open || windowWidth < 768) && (
        <div className="flex items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-9 px-3 hover:bg-primary/10 transition-colors"
                onClick={() => {
                  router.push('/');
                  router.refresh();
                }}
              >
                <Plus size={16} />
                <span className="ml-1 hidden sm:inline">New Chat</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Start New Conversation</TooltipContent>
          </Tooltip>

          {onResetSession && !isReadonly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 hover:bg-primary/10 transition-colors"
                  onClick={onResetSession}
                >
                  <RefreshCwIcon className="w-4 h-4" />
                  <span className="ml-1 hidden sm:inline">Reset Memory</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reset Conversation Memory</TooltipContent>
            </Tooltip>
          )}
        </div>
      )}

      {/* Model and Visibility Controls */}
      <div className="flex items-center gap-2 ml-auto">
        {!isReadonly && (
          <ModelSelector
            session={session}
            selectedModelId={selectedModelId}
            className="order-1 md:order-2"
          />
        )}

        {!isReadonly && (
          <VisibilitySelector
            chatId={chatId}
            selectedVisibilityType={selectedVisibilityType}
            className="order-1 md:order-3"
          />
        )}
      </div>
    </motion.header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
