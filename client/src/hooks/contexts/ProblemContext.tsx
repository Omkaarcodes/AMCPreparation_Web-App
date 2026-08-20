// client/src/contexts/ProblemAnalyticsContext.tsx
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { User } from 'firebase/auth';
import { ProblemAnalyticsManager, ProblemStats, ProblemAttempt, DailyProblemData } from '../../components/ProblemManager';

interface ProblemAnalyticsContextType {
  problemManager: ProblemAnalyticsManager | null ;
  problemStats: ProblemStats | null;
  problemLoading: boolean;
  unsavedAttempts: number;
  isOnline: boolean;
  emergencyRecovered: boolean;
  initializationComplete: boolean;
  // Helper methods
  recordProblemAttempt: (attempt: ProblemAttempt) => void;
  getTopTopics: (limit?: number) => Array<{topic: string, solved: number, accuracy: number}>;
  getDifficultyDistribution: () => Array<{difficulty: string, solved: number, attempts: number, accuracy: number}>;
  getPast30DaysData: () => Promise<DailyProblemData[]>;
  getTopicAccuracy: (topic: string) => number;
  getDifficultyAccuracy: (difficulty: number) => number;
  forceSave: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  refreshProblemState: () => void;
}

const ProblemAnalyticsContext = createContext<ProblemAnalyticsContextType | undefined>(undefined);

interface ProblemAnalyticsProviderProps {
  children: ReactNode;
  user: User | null;
}

export const ProblemAnalyticsProvider: React.FC<ProblemAnalyticsProviderProps> = ({ children, user }) => {
  const [problemManager, setProblemManager] = useState<ProblemAnalyticsManager | null>(null);
  const [problemStats, setProblemStats] = useState<ProblemStats | null>(null);
  const [problemLoading, setProblemLoading] = useState(true);
  const [unsavedAttempts, setUnsavedAttempts] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [emergencyRecovered, setEmergencyRecovered] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  
  const problemManagerRef = useRef<ProblemAnalyticsManager | null>(null);
  const initializationRef = useRef<boolean>(false);
  const userIdRef = useRef<string | null>(null);

  // Initialize Problem Analytics Manager when user changes
  useEffect(() => {
    const initializeProblemManager = async () => {
      const currentUserId = user?.uid || null;
      
      // Only reinitialize if user actually changed
      if (currentUserId === userIdRef.current && initializationRef.current) {
        return;
      }

      // Clean up previous state
      if (problemManagerRef.current) {
        await problemManagerRef.current.prepareForSignOut();
        problemManagerRef.current.destroy();
        problemManagerRef.current = null;
      }

      // Reset all state
      setProblemManager(null);
      setProblemStats(null);
      setEmergencyRecovered(false);
      setInitializationComplete(false);
      initializationRef.current = false;
      userIdRef.current = currentUserId;

      if (!user) {
        setProblemLoading(false);
        return;
      }

      // Set initialization flag to prevent double initialization
      initializationRef.current = true;
      setProblemLoading(true);
      
      try {
        console.log('Initializing Problem Analytics Manager for user:', user.uid);

        // Check for emergency recovery data first
        const emergencyData = await ProblemAnalyticsManager.recoverEmergencyData(user);
        let recoveredFromEmergency = false;
        let manager: ProblemAnalyticsManager;
        let stats: ProblemStats;

        if (emergencyData) {
          console.log('Recovering problem data from emergency save...');
          
          manager = new ProblemAnalyticsManager(user, emergencyData.stats);
          stats = emergencyData.stats;
          
          if (emergencyData.pendingAttempts && emergencyData.pendingAttempts.length > 0) {
            manager.setPendingAttempts(emergencyData.pendingAttempts);
            console.log(`Restored ${emergencyData.pendingAttempts.length} pending problem attempts`);
          }

          if (emergencyData.needsDailyResetSave) {
            manager.setNeedsDailyResetSave(true);
          }
          
          recoveredFromEmergency = true;
          setEmergencyRecovered(true);
          
          // Try to save the recovered data immediately
          try {
            await manager.forceSave();
            console.log('Emergency problem data successfully saved to database');
          } catch (saveError) {
            console.warn('Could not immediately save recovered problem data, will retry later:', saveError);
          }
          
        } else {
          // Normal initialization - load from database
          manager = new ProblemAnalyticsManager(user);
          stats = await manager.loadStats();
        }
        
        // Check and handle daily reset
        const dailyResetOccurred = manager.checkAndResetDaily();
        
        if (dailyResetOccurred) {
          console.log('Daily reset occurred during problem analytics initialization');
          stats = manager.getCurrentStats();
        }
        
        // Set up the manager and stats
        setProblemManager(manager);
        setProblemStats(stats);
        setUnsavedAttempts(manager.getPendingCount());
        problemManagerRef.current = manager;
        setInitializationComplete(true);
        
        if (recoveredFromEmergency) {
          console.log('Successfully recovered unsaved problem progress!');
        }
        
        console.log('Problem Analytics Manager initialization complete');
        
      } catch (error) {
        console.error('Failed to initialize problem analytics manager:', error);
        setEmergencyRecovered(false);
        setInitializationComplete(false);
        initializationRef.current = false;
        userIdRef.current = null;
      } finally {
        setProblemLoading(false);
      }
    };

    initializeProblemManager();

    // Cleanup on unmount or user change
    return () => {
      const currentUserId = user?.uid || null;
      
      if (currentUserId !== userIdRef.current && userIdRef.current !== null) {
        if (problemManagerRef.current) {
          problemManagerRef.current.prepareForSignOut().finally(() => {
            problemManagerRef.current?.destroy();
            problemManagerRef.current = null;
          });
        }
        initializationRef.current = false;
      }
    };
  }, [user?.uid]);

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('Connection restored');
      setIsOnline(true);
      if (problemManager) {
        problemManager.setOnlineStatus(true);
        
        if (problemManager.hasUnsavedChanges()) {
          console.log('Back online - attempting to save pending problem attempts...');
          problemManager.saveStats()
            .then(() => {
              console.log('Successfully saved pending problem attempts after reconnection');
              setUnsavedAttempts(problemManager.getPendingCount());
            })
            .catch(console.error);
        }
      }
    };

    const handleOffline = () => {
      console.log('Connection lost');
      setIsOnline(false);
      if (problemManager) {
        problemManager.setOnlineStatus(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOffline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [problemManager]);

  // Update unsaved attempts count periodically
  useEffect(() => {
    if (!problemManager || !initializationComplete) {
      return;
    }

    const interval = setInterval(() => {
      const currentUnsaved = problemManager.getPendingCount();
      const currentStats = problemManager.getCurrentStats();
      
      setUnsavedAttempts(currentUnsaved);
      setProblemStats(currentStats);
    }, 2000); // Changed from 3000 to 2000 to match XP system

    return () => clearInterval(interval);
  }, [problemManager, initializationComplete]);

  // Auto-save when unsaved attempts reach threshold
  useEffect(() => {
    if (!problemManager || !isOnline || unsavedAttempts === 0) {
      return;
    }

    // Auto-save when unsaved attempts exceed 5
    if (unsavedAttempts >= 5) {
      console.log(`Auto-saving problem stats: ${unsavedAttempts} pending attempts`);
      problemManager.saveStats()
        .then(() => {
          console.log('Problem stats auto-save successful');
          setUnsavedAttempts(problemManager.getPendingCount());
        })
        .catch((error) => {
          console.error('Problem stats auto-save failed:', error);
        });
    }
  }, [unsavedAttempts, problemManager, isOnline]);

  // Handle page unload events
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (problemManager && problemManager.hasUnsavedChanges()) {
        console.log('Page unloading - emergency save problem stats to localStorage');
        problemManager.emergencyLocalSave();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && problemManager && problemManager.hasUnsavedChanges()) {
        console.log('Tab hidden - attempting to save problem stats');
        problemManager.saveStats().catch(() => {
          console.log('Save failed - falling back to localStorage');
          problemManager.emergencyLocalSave();
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [problemManager]);

  // Record a problem attempt
  const recordProblemAttempt = useCallback((attempt: ProblemAttempt): void => {
    if (!problemManager || !initializationComplete) {
      console.warn('Problem Manager not available or not initialized');
      return;
    }
    
    if (problemManager.isDestroyed) {
      console.warn('Problem Manager has been destroyed');
      return;
    }
    
    try {
      problemManager.recordAttempt(attempt);
      
      // Update state immediately for UI responsiveness
      setProblemStats(problemManager.getCurrentStats());
      setUnsavedAttempts(problemManager.getPendingCount());
      
      console.log(`Recorded problem attempt: ${attempt.topic} (${attempt.difficulty}) - ${attempt.isCorrect ? 'Correct' : 'Incorrect'}`);
      
    } catch (error) {
      console.error('Error recording problem attempt:', error);
    }
  }, [problemManager, initializationComplete]);

  // Get top performing topics
  const getTopTopics = useCallback((limit: number = 5): Array<{topic: string, solved: number, accuracy: number}> => {
    return problemManager ? problemManager.getTopTopics(limit) : [];
  }, [problemManager]);

  // Get difficulty distribution
  const getDifficultyDistribution = useCallback((): Array<{difficulty: string, solved: number, attempts: number, accuracy: number}> => {
    return problemManager ? problemManager.getDifficultyDistribution() : [];
  }, [problemManager]);

  // Get past 30 days data
  const getPast30DaysData = useCallback(async (): Promise<DailyProblemData[]> => {
    if (!problemManager) return [];
    return await problemManager.getPast30DaysData();
  }, [problemManager]);

  // Get topic accuracy
  const getTopicAccuracy = useCallback((topic: string): number => {
    if (!problemStats || !problemStats.problems_by_topic[topic]) {
      return 0;
    }
    return problemStats.problems_by_topic[topic].accuracy;
  }, [problemStats]);

  // Get difficulty accuracy
  const getDifficultyAccuracy = useCallback((difficulty: number): number => {
    if (!problemStats) return 0;
    
    const difficultyKey = difficulty.toFixed(1);
    if (!problemStats.difficulty_stats[difficultyKey]) {
      return 0;
    }
    return problemStats.difficulty_stats[difficultyKey].accuracy;
  }, [problemStats]);

  // Refresh problem state
  const refreshProblemState = useCallback(() => {
    if (problemManager) {
      setProblemStats(problemManager.getCurrentStats());
      setUnsavedAttempts(problemManager.getPendingCount());
    }
  }, [problemManager]);

  // Force save
  const forceSave = useCallback(async () => {
    if (problemManager) {
      await problemManager.forceSave();
      setUnsavedAttempts(0);
      setProblemStats(problemManager.getCurrentStats());
    }
  }, [problemManager]);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return problemManager ? problemManager.hasUnsavedChanges() : false;
  }, [problemManager]);

  const contextValue: ProblemAnalyticsContextType = {
    problemManager,
    problemStats,
    problemLoading,
    unsavedAttempts,
    isOnline,
    emergencyRecovered,
    initializationComplete,
    recordProblemAttempt,
    getTopTopics,
    getDifficultyDistribution,
    getPast30DaysData,
    getTopicAccuracy,
    getDifficultyAccuracy,
    forceSave,
    hasUnsavedChanges,
    refreshProblemState
  };

  return (
    <ProblemAnalyticsContext.Provider value={contextValue}>
      {children}
    </ProblemAnalyticsContext.Provider>
  );
};

export const useProblemAnalytics = (): ProblemAnalyticsContextType => {
  const context = useContext(ProblemAnalyticsContext);
  if (context === undefined) {
    throw new Error('useProblemAnalytics must be used within a ProblemAnalyticsProvider');
  }
  return context;
};

// Higher-order component for pages that need problem analytics
export const withProblemAnalytics = <P extends object>(
  Component: React.ComponentType<P & { problemContext: ProblemAnalyticsContextType }>
) => {
  const WrappedComponent = (props: P) => {
    const problemContext = useProblemAnalytics();
    return React.createElement(Component, { ...props, problemContext } as P & { problemContext: ProblemAnalyticsContextType });
  };
  
  WrappedComponent.displayName = `withProblemAnalytics(${Component.displayName || Component.name})`;
  return WrappedComponent;
};