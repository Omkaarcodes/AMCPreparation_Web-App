import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { User } from 'firebase/auth';
import { XPProgressManager, XPProgress } from '../../components/XPBonuses';

interface XPContextType {
  xpManager: XPProgressManager | null;
  xpProgress: XPProgress | null;
  xpLoading: boolean;
  unsavedXP: number;
  isOnline: boolean;
  emergencyRecovered: boolean; // New: indicates if data was recovered from emergency save
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
  
  const xpManagerRef = useRef<XPProgressManager | null>(null);

  // Initialize XP Manager when user changes
  useEffect(() => {
    const initializeXPManager = async () => {
      if (!user) {
        setXpManager(null);
        setXpProgress(null);
        setXpLoading(false);
        setEmergencyRecovered(false);
        return;
      }

      setXpLoading(true);
      try {
        // Clean up previous manager if it exists
        if (xpManagerRef.current) {
          xpManagerRef.current.destroy();
        }

        // NEW: Check for emergency recovery data first
        const emergencyData = await XPProgressManager.recoverEmergencyData(user);
        let recoveredFromEmergency = false;

        let manager: XPProgressManager;
        let progress: XPProgress;

        if (emergencyData) {
          console.log('🔄 Recovering XP data from emergency save...');
          
          // FIXED: Create manager with recovered progress and set pending gains directly
          // Don't re-apply the gains since they're already in the progress
          manager = new XPProgressManager(user, emergencyData.progress);
          progress = emergencyData.progress;
          
          // FIXED: Set the pending gains directly instead of re-applying them
          // This maintains the unsaved state without duplicating XP
          if (emergencyData.pendingGains && emergencyData.pendingGains.length > 0) {
            console.log(`Restoring ${emergencyData.pendingGains.length} pending XP gains without re-applying...`);
            // Set the pending gains directly in the manager
            manager.setPendingGains(emergencyData.pendingGains);
          }
          
          recoveredFromEmergency = true;
          
          // Try to save the recovered data immediately to the database
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
        
        setXpManager(manager);
        setXpProgress(progress);
        setUnsavedXP(manager.getPendingXP());
        setEmergencyRecovered(recoveredFromEmergency);
        xpManagerRef.current = manager;
        
        // Award daily login bonus if it's a new day (only if not recovered from emergency)
        if (!recoveredFromEmergency) {
          awardDailyLoginBonus(manager, progress);
        }
        
        if (recoveredFromEmergency) {
          console.log('🎉 Successfully recovered unsaved XP progress!');
          // You might want to show a toast notification here
        }
        
      } catch (error) {
        console.error('Failed to initialize XP manager:', error);
        setEmergencyRecovered(false);
      } finally {
        setXpLoading(false);
      }
    };

    initializeXPManager();

    // Cleanup on unmount or user change
    return () => {
      if (xpManagerRef.current) {
        xpManagerRef.current.destroy();
        xpManagerRef.current = null;
      }
    };
  }, [user]);

  // Set up online/offline listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (xpManager) {
        xpManager.setOnlineStatus(true);
        
        // If we have unsaved changes and just came online, try to save
        if (xpManager.hasUnsavedChanges()) {
          console.log('📡 Back online - attempting to save pending XP...');
          xpManager.savePendingXP().catch(console.error);
        }
      }
    };

    const handleOffline = () => {
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

  // Update unsaved XP periodically and refresh state
  useEffect(() => {
    const interval = setInterval(() => {
      if (xpManager) {
        const currentUnsaved = xpManager.getPendingXP();
        const currentProgress = xpManager.getCurrentProgress();
        
        setUnsavedXP(currentUnsaved);
        setXpProgress(currentProgress);
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(interval);
  }, [xpManager]);

  // Auto-save when unsaved XP reaches certain thresholds (only when online)
  useEffect(() => {
    if (xpManager && unsavedXP > 0 && isOnline) {
      // Auto-save when unsaved XP exceeds 100 or every 50 XP
      if (unsavedXP >= 100 || (unsavedXP % 50 === 0 && unsavedXP > 0)) {
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
    }
  }, [unsavedXP, xpManager, isOnline]);

  // Save before page unload - Simplified to just use localStorage
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (xpManager && xpManager.hasUnsavedChanges()) {
        // Synchronous localStorage save - much more reliable during page unload
        xpManager.emergencyLocalSave();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [xpManager]);

  // Award daily login bonus
  const awardDailyLoginBonus = (manager: XPProgressManager, progress: XPProgress) => {
    const today = new Date();
    const lastXPDate = progress.last_xp_earned ? new Date(progress.last_xp_earned) : null;
    
    if (!lastXPDate || lastXPDate.toDateString() !== today.toDateString()) {
      const result = manager.addXP(XP_ACTIONS.DAILY_LOGIN.amount, 'daily_login');
      
      // Update streak
      manager.updateStreak(true);
      
      // Check for streak bonus
      const currentProgress = manager.getCurrentProgress();
      if (currentProgress.streak_days > 1 && currentProgress.streak_days % 7 === 0) {
        setTimeout(() => {
          manager.addXP(XP_ACTIONS.STREAK_BONUS.amount, 'streak_bonus');
          setXpProgress(manager.getCurrentProgress());
          setUnsavedXP(manager.getPendingXP());
        }, 1500);
      }
      
      setXpProgress(manager.getCurrentProgress());
      setUnsavedXP(manager.getPendingXP());
    }
  };

  // Refresh XP state - call this when external components modify XP
  const refreshXPState = useCallback(() => {
  if (xpManager) {
    setXpProgress(xpManager.getCurrentProgress());
    setUnsavedXP(xpManager.getPendingXP());
  }
}, [xpManager]);

  // Public method to award XP with predefined actions
  const awardXP = (action: string, customAmount?: number, customMessage?: string) => {
    if (!xpManager) {
      console.warn('XP Manager not available');
      return null;
    }
    
    const xpData = XP_ACTIONS[action as keyof typeof XP_ACTIONS];
    if (!xpData) {
      console.warn(`Unknown XP action: ${action}`);
      return null;
    }
    
    const amount = customAmount ?? xpData.amount;
    const message = customMessage ?? xpData.message;
    
    const result = xpManager.addXP(amount, action);
    setXpProgress(xpManager.getCurrentProgress());
    setUnsavedXP(xpManager.getPendingXP());
    
    // Log for debugging
    console.log(`Awarded ${amount} XP for ${message}`, result);
    
    return result;
  };

  // Public method to award raw XP amount (for custom components)
  const awardRawXP = (amount: number, customMessage?: string, actionType: string = 'custom_action') => {
    if (!xpManager) {
      console.warn('XP Manager not available');
      return null;
    }
    
    if (amount <= 0) {
      console.warn('XP amount must be positive');
      return null;
    }
    
    const result = xpManager.addXP(amount, actionType);
    setXpProgress(xpManager.getCurrentProgress());
    setUnsavedXP(xpManager.getPendingXP());
    
    // Log for debugging
    const message = customMessage || `Earned ${amount} XP!`;
    console.log(`Awarded ${amount} raw XP: ${message}`, result);
    
    return result;
  };

  // Get level progress percentage
  const getLevelProgress = () => {
    return xpManager ? xpManager.getLevelProgress() : 0;
  };

  // Force save
  const forceSave = async () => {
    if (xpManager) {
      await xpManager.forceSave();
      setUnsavedXP(0);
      setXpProgress(xpManager.getCurrentProgress());
    }
  };

  // Check for unsaved changes
  const hasUnsavedChanges = () => {
    return xpManager ? xpManager.hasUnsavedChanges() : false;
  };

  const contextValue: XPContextType = {
    xpManager,
    xpProgress,
    xpLoading,
    unsavedXP,
    isOnline,
    emergencyRecovered, // NEW: expose this to components
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