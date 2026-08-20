import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { User } from 'firebase/auth';
import { XPProgressManager, XPProgress } from '../../components/XPBonuses';

interface XPContextType {
  xpManager: XPProgressManager | null;
  xpProgress: XPProgress | null;
  xpLoading: boolean;
  unsavedXP: number;
  isOnline: boolean;
  emergencyRecovered: boolean;
  // Helper methods
  awardXP: (action: string, customAmount?: number, customMessage?: string) => any;
  awardRawXP: (amount: number, customMessage?: string, actionType?: string) => any;
  getLevelProgress: () => number;
  forceSave: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
  refreshXPState: () => void;
}

const XPContext = createContext<XPContextType | undefined>(undefined);

interface XPProviderProps {
  children: ReactNode;
  user: User | null;
}

// XP Action Types
const XP_ACTIONS = {
  PROBLEM_SOLVED_EASY: { amount: 10, message: "Easy problem solved!" },
  PROBLEM_SOLVED_MEDIUM: { amount: 20, message: "Medium problem solved!" },
  PROBLEM_SOLVED_HARD: { amount: 35, message: "Hard problem solved!" },
  QUIZ_COMPLETED: { amount: 50, message: "Quiz completed!" },
  MOCK_EXAM_COMPLETED: { amount: 100, message: "Mock exam completed!" },
  DAILY_LOGIN: { amount: 5, message: "Daily login bonus!" },
  STREAK_BONUS: { amount: 10, message: "Streak bonus!" },
  FIRST_TRY_CORRECT: { amount: 5, message: "First try bonus!" },
  TOPIC_MASTERY: { amount: 100, message: "Topic mastered!" },
  PERFECT_SCORE: { amount: 50, message: "Perfect score bonus!" },
  SPEED_BONUS: { amount: 15, message: "Speed completion bonus!" }
};

export const XPProvider: React.FC<XPProviderProps> = ({ children, user }) => {
  const [xpManager, setXpManager] = useState<XPProgressManager | null>(null);
  const [xpProgress, setXpProgress] = useState<XPProgress | null>(null);
  const [xpLoading, setXpLoading] = useState(true);
  const [unsavedXP, setUnsavedXP] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [emergencyRecovered, setEmergencyRecovered] = useState(false);
  const [dailyBonusAwarded, setDailyBonusAwarded] = useState(false);
  const [initializationComplete, setInitializationComplete] = useState(false);
  
  const xpManagerRef = useRef<XPProgressManager | null>(null);
  const initializationRef = useRef<boolean>(false);
  const userIdRef = useRef<string | null>(null);

  // Initialize XP Manager when user changes
  useEffect(() => {
    const initializeXPManager = async () => {
      const currentUserId = user?.uid || null;
      
      // Only reinitialize if user actually changed
      if (currentUserId === userIdRef.current && initializationRef.current) {
        return;
      }

      // Clean up previous state
      if (xpManagerRef.current) {
        await xpManagerRef.current.prepareForSignOut();
        xpManagerRef.current.destroy();
        xpManagerRef.current = null;
      }

      // Reset all state
      setXpManager(null);
      setXpProgress(null);
      setEmergencyRecovered(false);
      setDailyBonusAwarded(false);
      setInitializationComplete(false);
      initializationRef.current = false;
      userIdRef.current = currentUserId;

      if (!user) {
        setXpLoading(false);
        return;
      }

      // Set initialization flag to prevent double initialization
      initializationRef.current = true;

      setXpLoading(true);
      
      try {
        console.log('🚀 Initializing XP Manager for user:', user.uid);

        // Check for emergency recovery data first
        const emergencyData = await XPProgressManager.recoverEmergencyData(user);
        let recoveredFromEmergency = false;
        let manager: XPProgressManager;
        let progress: XPProgress;

        if (emergencyData) {
          console.log('🔄 Recovering XP data from emergency save...');
          
          manager = new XPProgressManager(user, emergencyData.progress);
          progress = emergencyData.progress;
          
          if (emergencyData.pendingGains && emergencyData.pendingGains.length > 0) {
            manager.setPendingGains(emergencyData.pendingGains);
            console.log(`Restored ${emergencyData.pendingGains.length} pending XP gains`);
          }

          if (emergencyData.needsDailyResetSave) {
            manager.setNeedsDailyResetSave(true);
          }
          
          recoveredFromEmergency = true;
          setEmergencyRecovered(true);
          
          // Try to save the recovered data immediately
          try {
            await manager.forceSave();
            console.log('✅ Emergency data successfully saved to database');
          } catch (saveError) {
            console.warn('⚠️ Could not immediately save recovered data, will retry later:', saveError);
          }
          
        } else {
          // Normal initialization - load from database
          manager = new XPProgressManager(user);
          progress = await manager.loadProgress();
        }
        
        // Check and handle daily reset - only once per session
        const dailyResetOccurred = manager.checkAndResetDailyProgress();
        
        if (dailyResetOccurred) {
          console.log('📅 Daily reset occurred during initialization');
          progress = manager.getCurrentProgress();
        }
        
        // Set up the manager and progress
        setXpManager(manager);
        setXpProgress(progress);
        setUnsavedXP(manager.getPendingXP());
        xpManagerRef.current = manager;
        
        // Award daily login bonus only if:
        // 1. Not recovered from emergency (to avoid double bonuses)
        // 2. Daily reset occurred OR it's first login of the day
        if (!recoveredFromEmergency) {
          const shouldAwardBonus = dailyResetOccurred || 
            progress.daily_xp_earned === 0 || 
            !progress.last_xp_earned ||
            !manager.isSameDay(new Date(progress.last_xp_earned), new Date());

          if (shouldAwardBonus) {
            // Delay bonus award to ensure state is stable
            setTimeout(() => {
              // Check if manager still exists and user hasn't changed
              if (xpManagerRef.current && userIdRef.current === user.uid) {
                awardDailyLoginBonus(xpManagerRef.current);
              }
            }, 1000);
          }
        }
        
        setInitializationComplete(true);
        
        if (recoveredFromEmergency) {
          console.log('🎉 Successfully recovered unsaved XP progress!');
        }
        
        console.log('✅ XP Manager initialization complete');
        
      } catch (error) {
        console.error('❌ Failed to initialize XP manager:', error);
        setEmergencyRecovered(false);
        setInitializationComplete(false);
        initializationRef.current = false;
        // Reset userIdRef on error to allow retry
        userIdRef.current = null;
      } finally {
        setXpLoading(false);
      }
    };

    initializeXPManager();

    // Cleanup on unmount or user change
    return () => {
      const currentUserId = user?.uid || null;
      
      // Only cleanup if user is actually changing (not just going from null to user)
      if (currentUserId !== userIdRef.current && userIdRef.current !== null) {
        if (xpManagerRef.current) {
          xpManagerRef.current.prepareForSignOut().finally(() => {
            xpManagerRef.current?.destroy();
            xpManagerRef.current = null;
          });
        }
        initializationRef.current = false;
      }
    };
  }, [user?.uid]); // Only depend on user ID

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log('📡 Connection restored');
      setIsOnline(true);
      if (xpManager) {
        xpManager.setOnlineStatus(true);
        
        // If we have unsaved changes and just came online, try to save
        if (xpManager.hasUnsavedChanges()) {
          console.log('📡 Back online - attempting to save pending XP...');
          xpManager.savePendingXP()
            .then(() => {
              console.log('✅ Successfully saved pending XP after reconnection');
              setUnsavedXP(xpManager.getPendingXP());
            })
            .catch(console.error);
        }
      }
    };

    const handleOffline = () => {
      console.log('📡 Connection lost');
      setIsOnline(false);
      if (xpManager) {
        xpManager.setOnlineStatus(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [xpManager]);

  // Update unsaved XP and progress state periodically
  useEffect(() => {
    if (!xpManager || !initializationComplete) {
      return;
    }

    const interval = setInterval(() => {
      const currentUnsaved = xpManager.getPendingXP();
      const currentProgress = xpManager.getCurrentProgress();
      
      setUnsavedXP(currentUnsaved);
      setXpProgress(currentProgress);
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [xpManager, initializationComplete]);

  // Auto-save when unsaved XP reaches certain thresholds (only when online)
  useEffect(() => {
    if (!xpManager || !isOnline || unsavedXP === 0) {
      return;
    }

    // Auto-save when unsaved XP exceeds 100 points
    if (unsavedXP >= 100) {
      console.log(`💾 Auto-saving XP: ${unsavedXP} pending`);
      xpManager.savePendingXP()
        .then(() => {
          console.log('✅ Auto-save successful');
          setUnsavedXP(xpManager.getPendingXP());
        })
        .catch((error) => {
          console.error('❌ Auto-save failed:', error);
        });
    }
  }, [unsavedXP, xpManager, isOnline]);

  // Handle page unload events
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (xpManager && xpManager.hasUnsavedChanges()) {
        console.log('💾 Page unloading - emergency save to localStorage');
        xpManager.emergencyLocalSave();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && xpManager && xpManager.hasUnsavedChanges()) {
        console.log('👁️ Tab hidden - attempting to save XP');
        xpManager.savePendingXP().catch(() => {
          console.log('💾 Save failed - falling back to localStorage');
          xpManager.emergencyLocalSave();
        });
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [xpManager]);

  // Reset daily bonus flag at midnight
  useEffect(() => {
    const checkMidnight = () => {
      const now = new Date();
      // Reset daily bonus flag at midnight
      if (now.getHours() === 0 && now.getMinutes() === 0 && dailyBonusAwarded) {
        console.log('🕛 Midnight - resetting daily bonus flag');
        setDailyBonusAwarded(false);
        
        // Also reset the daily processed flag in the manager
        if (xpManager) {
          xpManager.resetDailyProcessedFlag();
        }
      }
    };

    const interval = setInterval(checkMidnight, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [dailyBonusAwarded, xpManager]);

  // Award daily login bonus function
  const awardDailyLoginBonus = useCallback((manager: XPProgressManager) => {
    if (dailyBonusAwarded) {
      console.log('📅 Daily bonus already awarded in this session');
      return;
    }

    const currentProgress = manager.getCurrentProgress();
    const today = new Date();
    const lastXPDate = currentProgress.last_xp_earned ? new Date(currentProgress.last_xp_earned) : null;
    
    // Check if eligible for daily bonus
    const shouldAwardBonus = 
      !lastXPDate || 
      !manager.isSameDay(lastXPDate, today) || 
      currentProgress.daily_xp_earned === 0;
    
    if (shouldAwardBonus) {
      console.log('🎁 Awarding daily login bonus');
      
      // Award daily login bonus
      const result = manager.addXP(XP_ACTIONS.DAILY_LOGIN.amount, 'daily_login');
      
      // Update streak
      manager.updateStreak();
      
      // Get updated progress after streak calculation
      const updatedProgress = manager.getCurrentProgress();
      
      // Check for streak bonus (every 7 days)
      if (updatedProgress.streak_days > 1 && updatedProgress.streak_days % 7 === 0) {
        console.log(`🔥 Awarding 7-day streak bonus! Streak: ${updatedProgress.streak_days} days`);
        setTimeout(() => {
          if (manager && !manager.isDestroyed) {
            manager.addXP(XP_ACTIONS.STREAK_BONUS.amount, 'streak_bonus');
            setXpProgress(manager.getCurrentProgress());
            setUnsavedXP(manager.getPendingXP());
          }
        }, 1500);
      }
      
      // Update state
      setXpProgress(manager.getCurrentProgress());
      setUnsavedXP(manager.getPendingXP());
      setDailyBonusAwarded(true);
      
      console.log('✅ Daily login bonus awarded successfully');
    } else {
      console.log('📅 Daily bonus not eligible - already earned XP today');
      setDailyBonusAwarded(true); // Prevent further attempts
    }
  }, [dailyBonusAwarded]);

  // Refresh XP state - call this when external components modify XP
  const refreshXPState = useCallback(() => {
    if (xpManager) {
      setXpProgress(xpManager.getCurrentProgress());
      setUnsavedXP(xpManager.getPendingXP());
    }
  }, [xpManager]);

  // Public method to award XP with predefined actions
  const awardXP = useCallback((action: string, customAmount?: number, customMessage?: string) => {
    if (!xpManager || !initializationComplete) {
      console.warn('XP Manager not available or not initialized');
      return null;
    }
    
    // Check if manager is destroyed
    if (xpManager.isDestroyed && typeof xpManager.isDestroyed === 'function') {
      console.warn('XP Manager has been destroyed');
      return null;
    }
    
    const xpData = XP_ACTIONS[action as keyof typeof XP_ACTIONS];
    if (!xpData) {
      console.warn(`Unknown XP action: ${action}`);
      return null;
    }
    
    const amount = customAmount ?? xpData.amount;
    const message = customMessage ?? xpData.message;
    
    try {
      const result = xpManager.addXP(amount, action);
      
      // Update state immediately for UI responsiveness
      setXpProgress(xpManager.getCurrentProgress());
      setUnsavedXP(xpManager.getPendingXP());
      
      // Log for debugging
      console.log(`🎯 Awarded ${amount} XP for ${message}`, result);
      
      return result;
    } catch (error) {
      console.error('❌ Error awarding XP:', error);
      return null;
    }
  }, [xpManager, initializationComplete]);

  // Public method to award raw XP amount
  const awardRawXP = useCallback((amount: number, customMessage?: string, actionType: string = 'custom_action') => {
    if (!xpManager || !initializationComplete) {
      console.warn('XP Manager not available or not initialized');
      return null;
    }
    
    if (amount <= 0) {
      console.warn('XP amount must be positive');
      return null;
    }
    
    // Check if manager is destroyed
    if (xpManager.isDestroyed && typeof xpManager.isDestroyed === 'function') {
      console.warn('XP Manager has been destroyed');
      return null;
    }
    
    try {
      const result = xpManager.addXP(amount, actionType);
      
      // Update state immediately
      setXpProgress(xpManager.getCurrentProgress());
      setUnsavedXP(xpManager.getPendingXP());
      
      // Log for debugging
      const message = customMessage || `Earned ${amount} XP!`;
      console.log(`🎯 Awarded ${amount} raw XP: ${message}`, result);
      
      return result;
    } catch (error) {
      console.error('❌ Error awarding raw XP:', error);
      return null;
    }
  }, [xpManager, initializationComplete]);

  // Get level progress percentage
  const getLevelProgress = useCallback(() => {
    return xpManager ? xpManager.getLevelProgress() : 0;
  }, [xpManager]);

  // Force save
  const forceSave = useCallback(async () => {
    if (xpManager) {
      await xpManager.forceSave();
      setUnsavedXP(0);
      setXpProgress(xpManager.getCurrentProgress());
    }
  }, [xpManager]);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return xpManager ? xpManager.hasUnsavedChanges() : false;
  }, [xpManager]);

  const contextValue: XPContextType = {
    xpManager,
    xpProgress,
    xpLoading,
    unsavedXP,
    isOnline,
    emergencyRecovered,
    awardXP,
    awardRawXP,
    getLevelProgress,
    forceSave,
    hasUnsavedChanges,
    refreshXPState
  };

  return (
    <XPContext.Provider value={contextValue}>
      {children}
    </XPContext.Provider>
  );
};

export const useXP = () => {
  const context = useContext(XPContext);
  if (context === undefined) {
    throw new Error('useXP must be used within an XPProvider');
  }
  return context;
};

// Higher-order component for pages that need XP functionality
export const withXP = <P extends object>(Component: React.ComponentType<P>) => {
  return (props: P) => {
    const xpContext = useXP();
    return <Component {...props} xpContext={xpContext} />;
  };
};