/**
 * V2 Achievements Engine Toggle Component
 * 
 * Simple toggle switch to enable/disable V2 engine for testing
 */

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

declare global {
  interface Window {
    enableV2Engine?: () => void;
    disableV2Engine?: () => void;
    isV2Enabled?: () => boolean;
    logV2Status?: () => void;
    testV2Regression?: (players: any[], teams: any[]) => void;
  }
}

export function V2Toggle() {
  const [isV2Enabled, setIsV2Enabled] = useState(false);
  
  useEffect(() => {
    // Initialize V2 functions on window for easy access
    const initV2 = async () => {
      try {
        const v2Manager = await import('@/lib/achievements-v2-manager');
        
        window.enableV2Engine = v2Manager.enableV2Engine;
        window.disableV2Engine = v2Manager.disableV2Engine;
        window.isV2Enabled = v2Manager.isV2Enabled;
        window.logV2Status = v2Manager.logV2Status;
        window.testV2Regression = v2Manager.testV2Regression;
        
        setIsV2Enabled(v2Manager.isV2Enabled());
      } catch (error) {
        console.warn('V2 manager not available:', error);
      }
    };
    
    initV2();
  }, []);
  
  const handleToggle = (enabled: boolean) => {
    if (enabled) {
      window.enableV2Engine?.();
    } else {
      window.disableV2Engine?.();
    }
    setIsV2Enabled(enabled);
  };
  
  const handleLogStatus = () => {
    window.logV2Status?.();
  };
  
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">V2 Achievements Engine</CardTitle>
        <CardDescription className="text-xs">
          Toggle between V1 and V2 achievement validation systems
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Engine Version:</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">V1</span>
            <Switch
              checked={isV2Enabled}
              onCheckedChange={handleToggle}
              data-testid="v2-toggle-switch"
            />
            <span className="text-xs text-muted-foreground">V2</span>
          </div>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="text-xs text-muted-foreground">
            Current: <span className="font-medium">{isV2Enabled ? 'V2 (NEW)' : 'V1 (LEGACY)'}</span>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogStatus}
            className="text-xs h-7"
            data-testid="v2-log-status"
          >
            Log Status
          </Button>
        </div>
        
        {isV2Enabled && (
          <div className="text-xs p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
            ✅ V2 engine active:
            <ul className="mt-1 ml-2 space-y-0.5 text-[11px]">
              <li>• Canonical achievement IDs</li>
              <li>• Robust draft parser (fixes Jokić cases)</li> 
              <li>• Career-ever vs season-aligned logic</li>
              <li>• Single validator (stops contradictions)</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}