'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWindowSize } from 'usehooks-ts';

import { ModelSelector } from '@/components/model-selector';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { Button } from '@/components/ui/button';
import { PlusIcon, VercelIcon } from './icons';
import { RefreshCwIcon, Sparkles } from 'lucide-react';
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
            <span className="font-semibold text-lg hidden sm:inline">Mastra Chat</span>
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
                <PlusIcon size={16} />
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

      {/* Deploy Button */}
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Button
          className="bg-gradient-to-r from-zinc-900 to-zinc-800 dark:from-zinc-100 dark:to-zinc-200 hover:from-zinc-800 hover:to-zinc-700 dark:hover:from-zinc-200 dark:hover:to-zinc-300 text-zinc-50 dark:text-zinc-900 hidden md:flex py-2 px-3 h-9 shadow-sm transition-all duration-200"
          asChild
        >
          <Link
            href={`https://vercel.com/new/clone?repository-url=https://github.com/vercel/ai-chatbot&env=AUTH_SECRET&envDescription=Learn more about how to get the API Keys for the application&envLink=https://github.com/vercel/ai-chatbot/blob/main/.env.example&demo-title=AI Chatbot&demo-description=An Open-Source AI Chatbot Template Built With Next.js and the AI SDK by Vercel.&demo-url=https://chat.vercel.ai&products=[{"type":"integration","protocol":"ai","productSlug":"grok","integrationSlug":"xai"},{"type":"integration","protocol":"storage","productSlug":"neon","integrationSlug":"neon"},{"type":"integration","protocol":"storage","productSlug":"upstash-kv","integrationSlug":"upstash"},{"type":"blob"}]`}
            target="_noblank"
          >
            <VercelIcon size={16} />
            <span className="ml-1">Deploy</span>
          </Link>
        </Button>
      </motion.div>
    </motion.header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return prevProps.selectedModelId === nextProps.selectedModelId;
});
