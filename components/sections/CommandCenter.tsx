'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Activity, Play, Square, RefreshCcw, Settings } from 'lucide-react';
import { Input } from '@/components/ui/input';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function CommandCenter() {
  const { user, loading, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [bots, setBots] = useState<any[]>([]);
  const [isLoadingBots, setIsLoadingBots] = useState(true);
  const [isCommanding, setIsCommanding] = useState(false);
  const [tradingEngineUrl, setTradingEngineUrl] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTradingEngineUrl(window.location.origin);
    }
  }, []);

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
      setIsLoadingBots(false);
      handleFirestoreError(err, OperationType.GET, 'bot_states');
    });

    return () => unsubscribe();
  }, [user]);

  const sendCommand = async (action: 'start' | 'stop', botId?: string) => {
    if (!user) return;
    setIsCommanding(true);
    try {
      if (action === 'start') {
        const newBotRef = doc(collection(db, 'bot_states'));
        await setDoc(newBotRef, {
          userId: user.uid,
          pair: ["SOL-USDC", "BTC-USDC", "ETH-USDC", "JUP-USDC"][Math.floor(Math.random() * 4)],
          status: 'active',
          pnl: 0,
          createdAt: new Date().toISOString()
        });
      } else if (action === 'stop' && botId) {
        await updateDoc(doc(db, 'bot_states', botId), {
          status: 'stopped'
        });
      }

      toast({
        title: 'Command Transmitted',
        description: `Successfully executed ${action.toUpperCase()} command locally on this domain.`,
      });
    } catch (error: any) {
      console.error("Command failed", error);
      handleFirestoreError(error, action === 'start' ? OperationType.CREATE : OperationType.UPDATE, 'bot_states');
      toast({
        title: 'Command Failed',
        description: error.message || 'Failed to update trading engine state.',
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
        <CardContent className="space-y-4">
          <Button onClick={signInWithGoogle} className="w-full font-bold bg-primary hover:bg-primary/80">
            CONNECT TO TRADING ENGINE
          </Button>
        </CardContent>
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
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="border-primary/50 hover:bg-primary/20 text-xs font-mono"
                onClick={() => sendCommand('start')}
                disabled={isCommanding}
              >
                <Play className="h-3 w-3 mr-2" /> FORCE DEPLOY NEW BOT
              </Button>
            </div>
          </CardTitle>
          <CardDescription className="text-white/70 font-mono">
            Live telemetry from the Trading Engine (Running locally on this domain).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
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
