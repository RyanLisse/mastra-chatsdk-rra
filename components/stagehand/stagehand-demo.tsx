/**
 * Stagehand Demo Component
 * 
 * This component demonstrates Stagehand integration following best practices:
 * - Client-side component with server action integration
 * - Proper error handling and loading states
 * - Support for both LOCAL and BROWSERBASE environments
 * - User-friendly interface for web automation
 */

'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, Globe, Camera, Eye, MousePointer } from 'lucide-react';
import {
  createStagehandSession,
  stagehandNavigate,
  stagehandAct,
  stagehandExtract,
  stagehandObserve,
  stagehandScreenshot,
} from '@/lib/stagehand/actions';

interface StagehandSession {
  sessionId: string;
  debugUrl?: string;
}

export function StagehandDemo() {
  const [session, setSession] = useState<StagehandSession | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form states
  const [url, setUrl] = useState('https://docs.stagehand.dev/');
  const [action, setAction] = useState('');
  const [extractInstruction, setExtractInstruction] = useState('');
  const [observeInstruction, setObserveInstruction] = useState('');
  
  // Results
  const [extractResult, setExtractResult] = useState<any>(null);
  const [observeResult, setObserveResult] = useState<any[]>([]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  const handleCreateSession = useCallback(async () => {
    setLoading(true);
    clearMessages();
    
    try {
      const result = await createStagehandSession();
      
      if (result.success && result.session) {
        setSession(result.session);
        setSuccess('Browserbase session created successfully!');
      } else {
        setError(result.error || 'Failed to create session');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [clearMessages]);

  const handleNavigate = useCallback(async () => {
    if (!url) return;
    
    setLoading(true);
    clearMessages();
    
    try {
      const result = await stagehandNavigate({
        url,
        sessionId: session?.sessionId,
      });
      
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.error || 'Navigation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [url, session?.sessionId, clearMessages]);

  const handleAction = useCallback(async () => {
    if (!action) return;
    
    setLoading(true);
    clearMessages();
    
    try {
      const result = await stagehandAct({
        action,
        sessionId: session?.sessionId,
      });
      
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.error || 'Action failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [action, session?.sessionId, clearMessages]);

  const handleExtract = useCallback(async () => {
    if (!extractInstruction) return;
    
    setLoading(true);
    clearMessages();
    setExtractResult(null);
    
    try {
      const result = await stagehandExtract({
        instruction: extractInstruction,
        schema: { title: 'string' }, // Simple schema for demo
        sessionId: session?.sessionId,
      });
      
      if (result.success) {
        setExtractResult(result.data);
        setSuccess('Data extracted successfully!');
      } else {
        setError(result.error || 'Extraction failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [extractInstruction, session?.sessionId, clearMessages]);

  const handleObserve = useCallback(async () => {
    setLoading(true);
    clearMessages();
    setObserveResult([]);
    
    try {
      const result = await stagehandObserve({
        instruction: observeInstruction || undefined,
        sessionId: session?.sessionId,
      });
      
      if (result.success && result.actions) {
        setObserveResult(result.actions);
        setSuccess(`Found ${result.actions.length} possible actions`);
      } else {
        setError(result.error || 'Observation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [observeInstruction, session?.sessionId, clearMessages]);

  const handleScreenshot = useCallback(async () => {
    setLoading(true);
    clearMessages();
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const result = await stagehandScreenshot({
        path: `stagehand-screenshot-${timestamp}.png`,
        sessionId: session?.sessionId,
      });
      
      if (result.success) {
        setSuccess(result.message);
      } else {
        setError(result.error || 'Screenshot failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [session?.sessionId, clearMessages]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Stagehand Web Automation Demo
          </CardTitle>
          <CardDescription>
            Demonstrate Stagehand capabilities with atomic, specific actions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Session Management */}
          <div className="flex items-center gap-4">
            <Button
              onClick={handleCreateSession}
              disabled={loading || !!session}
              className="flex items-center gap-2"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Create Browserbase Session
            </Button>
            {session && (
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Session Active</Badge>
                {session.debugUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(session.debugUrl, '_blank')}
                  >
                    View Debug
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Navigation */}
          <div className="space-y-2">
            <label htmlFor="navigation-url" className="text-sm font-medium">Navigate to URL</label>
            <div className="flex gap-2">
              <Input
                id="navigation-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="flex-1"
              />
              <Button onClick={handleNavigate} disabled={loading || !url}>
                <Globe className="h-4 w-4 mr-2" />
                Navigate
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <label htmlFor="action-input" className="text-sm font-medium">Perform Action</label>
            <div className="flex gap-2">
              <Input
                id="action-input"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="Click the quickstart link"
                className="flex-1"
              />
              <Button onClick={handleAction} disabled={loading || !action}>
                <MousePointer className="h-4 w-4 mr-2" />
                Act
              </Button>
            </div>
          </div>

          {/* Extract */}
          <div className="space-y-2">
            <label htmlFor="extract-input" className="text-sm font-medium">Extract Data</label>
            <div className="flex gap-2">
              <Input
                id="extract-input"
                value={extractInstruction}
                onChange={(e) => setExtractInstruction(e.target.value)}
                placeholder="Extract the main heading of the page"
                className="flex-1"
              />
              <Button onClick={handleExtract} disabled={loading || !extractInstruction}>
                Extract
              </Button>
            </div>
            {extractResult && (
              <div className="p-3 bg-muted rounded-md">
                <pre className="text-sm">{JSON.stringify(extractResult, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Observe */}
          <div className="space-y-2">
            <label htmlFor="observe-input" className="text-sm font-medium">Observe Actions</label>
            <div className="flex gap-2">
              <Input
                id="observe-input"
                value={observeInstruction}
                onChange={(e) => setObserveInstruction(e.target.value)}
                placeholder="Find all buttons on the page (optional)"
                className="flex-1"
              />
              <Button onClick={handleObserve} disabled={loading}>
                <Eye className="h-4 w-4 mr-2" />
                Observe
              </Button>
            </div>
            {observeResult.length > 0 && (
              <div className="p-3 bg-muted rounded-md max-h-40 overflow-y-auto">
                <pre className="text-sm">{JSON.stringify(observeResult, null, 2)}</pre>
              </div>
            )}
          </div>

          {/* Screenshot */}
          <div className="flex justify-end">
            <Button onClick={handleScreenshot} disabled={loading} variant="outline">
              <Camera className="h-4 w-4 mr-2" />
              Take Screenshot
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
