import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { XPProgressManager, XPProgress } from '../../components/XPBonuses';


interface XPContextType {
  xpManager: XPProgressManager | null;
  xpProgress: XPProgress | null;
  xpLoading: boolean;
  unsavedXP: number;
  isOnline: boolean;
  // Helper methods
  awardXP: (action: string, customAmount?: number, customMessage?: string) => void;
  getLevelProgress: () => number;
  forceSave: () => Promise<void>;
  hasUnsavedChanges: () => boolean;
}

const XPContext = createContext<XPContextType | undefined>(undefined);

interface XPProviderProps {
  children: ReactNode;
  user: User | null; // Pass the current user from your auth system
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
  
  const xpManagerRef = useRef<XPProgressManager | null>(null);

  // Initialize XP Manager when user changes
  useEffect(() => {
    const initializeXPManager = async () => {
      if (!user) {
        setXpManager(null);
        setXpProgress(null);
        setXpLoading(false);
        return;
      }

      setXpLoading(true);
      try {
        // Clean up previous manager if it exists
        if (xpManagerRef.current) {
          xpManagerRef.current.destroy();
        }

        const manager = new XPProgressManager(user);
        const progress = await manager.loadProgress();
        
        setXpManager(manager);
        setXpProgress(progress);
        xpManagerRef.current = manager;
        
        // Award daily login bonus if it's a new day
        awardDailyLoginBonus(manager, progress);
        
      } catch (error) {
        console.error('Failed to initialize XP manager:', error);
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

  // Update unsaved XP periodically
  useEffect(() => {
    const interval = setInterval(() => {
      if (xpManager) {
        setUnsavedXP(xpManager.getPendingXP());
      }
    }, 5000);

    return () => clearInterval(interval);
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
        }, 1500);
      }
      
      setXpProgress(manager.getCurrentProgress());
    }
  };

  // Public method to award XP
  const awardXP = (action: string, customAmount?: number, customMessage?: string) => {
    if (!xpManager) {
      console.warn('XP Manager not available');
      return;
    }
    
    const xpData = XP_ACTIONS[action as keyof typeof XP_ACTIONS];
    if (!xpData) {
      console.warn(`Unknown XP action: ${action}`);
      return;
    }
    
    const amount = customAmount ?? xpData.amount;
    const message = customMessage ?? xpData.message;
    
    const result = xpManager.addXP(amount, action);
    setXpProgress(xpManager.getCurrentProgress());
    setUnsavedXP(xpManager.getPendingXP());
    
    // You can emit events here for notifications if needed
    console.log(`Awarded ${amount} XP for ${message}`, result);
    
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
    awardXP,
    getLevelProgress,
    forceSave,
    hasUnsavedChanges
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