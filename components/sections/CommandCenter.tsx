'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Activity, Play, Square, RefreshCcw } from 'lucide-react';

export function CommandCenter() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [bots, setBots] = useState<any[]>([]);
  const [isLoadingBots, setIsLoadingBots] = useState(true);
  const [isCommanding, setIsCommanding] = useState(false);

  // The external Trading Engine URL
  const TRADING_ENGINE_URL = "https://ais-dev-aao5behypscgwvze3hwwqj-40280094919.us-west1.run.app";

  useEffect(() => {
    if (!user) {
      setIsLoadingBots(false);
      return;
    }

    // Subscribe to Bot State Persistence (Upgrade 2 on Trading Engine)
    const q = query(collection(db, 'bot_states'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const botsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBots(botsData);
      setIsLoadingBots(false);
    }, (err) => {
      console.error("Error fetching bots:", err);
      setIsLoadingBots(false);
    });

    return () => unsubscribe();
  }, [user]);

  const sendCommand = async (action: 'start' | 'stop', botId?: string) => {
    if (!user) return;
    setIsCommanding(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch(`${TRADING_ENGINE_URL}/api/webhooks/hq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action, botId })
      });

      if (!response.ok) {
        throw new Error(`Engine returned ${response.status}`);
      }

      toast({
        title: 'Command Transmitted',
        description: `Successfully transmitted ${action.toUpperCase()} command to Trading Engine.`,
      });
    } catch (error: any) {
      console.error("Command failed", error);
      toast({
        title: 'Command Failed',
        description: error.message || 'Failed to reach the Trading Engine Webhook.',
        variant: 'destructive'
      });
    } finally {
      setIsCommanding(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-black/40 border-white/10 cyber-panel p-8 text-center border-primary/20">
        <Loader2 className="animate-spin h-8 w-8 mx-auto text-primary" />
        <p className="mt-4 text-muted-foreground font-mono">Establishing Uplink...</p>
      </Card>
    );
  }

  if (!user) {
    return (
      <Card className="bg-black/40 border-white/10 cyber-panel">
        <CardHeader>
          <CardTitle className="font-orbitron text-2xl text-primary flex items-center gap-2">
            <Activity className="h-6 w-6 text-destructive" />
            Uplink Severed
          </CardTitle>
          <CardDescription className="text-white/70 font-mono">
            Authenticate to establish a secure connection to the Trading Engine.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-black/40 border-white/10 cyber-panel">
        <CardHeader>
          <CardTitle className="font-orbitron text-xl text-primary flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500 animate-pulse" />
              Active Trading Automations
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              className="border-primary/50 hover:bg-primary/20 text-xs font-mono"
              onClick={() => sendCommand('start')}
              disabled={isCommanding}
            >
              <Play className="h-3 w-3 mr-2" /> FORCE DEPLOY NEW BOT
            </Button>
          </CardTitle>
          <CardDescription className="text-white/70 font-mono">
            Live telemetry from the Trading Engine (Requires Upgrade 2 & 3).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBots ? (
            <div className="py-8 text-center">
              <Loader2 className="animate-spin h-6 w-6 mx-auto text-primary" />
              <p className="mt-4 text-xs text-muted-foreground font-mono">Syncing Telemetry...</p>
            </div>
          ) : bots.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-white/10 rounded bg-white/5">
              <p className="text-muted-foreground font-mono text-sm">No active bots detected in the vault.</p>
              <p className="text-muted-foreground font-mono text-xs mt-2">Ensure the Trading Engine has executed Upgrade 2.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bots.map((bot) => (
                <Card key={bot.id} className="bg-black/60 border-white/10">
                  <CardHeader className="p-4 pb-2">
                    <CardTitle className="text-base text-primary font-mono">{bot.pair || 'Unknown Pair'}</CardTitle>
                    <CardDescription className="text-xs">Status: <span className={bot.status === 'active' ? 'text-green-500' : 'text-yellow-500'}>{bot.status?.toUpperCase()}</span></CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center text-xs font-mono mb-4">
                      <span className="text-muted-foreground">PnL:</span>
                      <span className={bot.pnl >= 0 ? "text-green-500" : "text-destructive"}>
                        {bot.pnl >= 0 ? '+' : ''}{bot.pnl || '0.00'}
                      </span>
                    </div>
                    <Button 
                      variant="destructive" 
                      size="sm" 
                      className="w-full text-xs font-bold"
                      onClick={() => sendCommand('stop', bot.id)}
                      disabled={isCommanding}
                    >
                      <Square className="h-3 w-3 mr-2" /> TERMINATE
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
