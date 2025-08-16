// XPProgressManager.ts
import { User } from 'firebase/auth';

export interface XPProgress {
  user_id: string;
  current_level: number;
  total_xp: number;
  xp_towards_next: number;
  last_xp_earned?: Date;
  daily_xp_earned: number;
  streak_days: number;
  updated_at?: Date;
}

export interface XPGain {
  amount: number;
  source: string;
  timestamp: Date;
}

export class XPProgressManager {
  private user: User;
  private currentProgress: XPProgress;
  private pendingXPGains: XPGain[] = [];
  private lastSaveTime: Date = new Date();
  private isOnline: boolean = true;
  private isDestroyed: boolean = false;

  // XP Constants
  private static readonly BASE_XP_PER_LEVEL = 100;
  private static readonly XP_MULTIPLIER = 1.2;
  private static readonly MAX_PENDING_GAINS = 100; // Increased since we're not auto-saving

  constructor(user: User, initialProgress?: XPProgress) {
    this.user = user;
    this.currentProgress = initialProgress || this.getDefaultProgress();
    this.setupPageUnloadListeners();
  }

  private getDefaultProgress(): XPProgress {
    return {
      user_id: this.user.uid,
      current_level: 1,
      total_xp: 0,
      xp_towards_next: 0,
      daily_xp_earned: 0,
      streak_days: 0
    };
  }

  private setupPageUnloadListeners(): void {
    // Save when tab becomes hidden (user switches tabs/minimizes)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.pendingXPGains.length > 0) {
        this.savePendingXP().catch(console.error);
      }
    });

    // Save before page unload (refresh, navigation, close)
    window.addEventListener('beforeunload', (event) => {
      if (this.pendingXPGains.length > 0) {
        // Use sendBeacon for reliable saving before page unload
        this.sendBeaconSave();
        
        // Optional: Show warning if there are unsaved changes
        // Uncomment if you want to warn users about unsaved progress
        // event.preventDefault();
        // event.returnValue = 'You have unsaved progress. Are you sure you want to leave?';
        // return event.returnValue;
      }
    });

    // Save when user navigates using browser back/forward buttons
    window.addEventListener('popstate', () => {
      if (this.pendingXPGains.length > 0) {
        this.savePendingXP().catch(console.error);
      }
    });
  }

  // Calculate XP needed for a specific level
  private getXPForLevel(level: number): number {
    return Math.floor(XPProgressManager.BASE_XP_PER_LEVEL * Math.pow(XPProgressManager.XP_MULTIPLIER, level - 1));
  }

  // Get total XP needed to reach a level
  private getTotalXPForLevel(level: number): number {
    let totalXP = 0;
    for (let i = 1; i < level; i++) {
      totalXP += this.getXPForLevel(i);
    }
    return totalXP;
  }

  // Add XP and handle level ups
  public addXP(amount: number, source: string): { leveledUp: boolean; newLevel?: number; oldLevel?: number } {
    if (this.isDestroyed) {
      console.warn('Cannot add XP to destroyed XPProgressManager');
      return { leveledUp: false };
    }

    const oldLevel = this.currentProgress.current_level;
    
    // Add to pending gains
    this.pendingXPGains.push({
      amount,
      source,
      timestamp: new Date()
    });

    // Update local progress immediately for UI responsiveness
    this.currentProgress.total_xp += amount;
    this.currentProgress.xp_towards_next += amount;
    this.currentProgress.daily_xp_earned += amount;
    this.currentProgress.last_xp_earned = new Date();

    // Check for level up
    const xpNeededForCurrentLevel = this.getXPForLevel(this.currentProgress.current_level);
    let leveledUp = false;

    while (this.currentProgress.xp_towards_next >= xpNeededForCurrentLevel) {
      this.currentProgress.xp_towards_next -= xpNeededForCurrentLevel;
      this.currentProgress.current_level++;
      leveledUp = true;
    }

    // Only save if we've reached the maximum pending gains limit (safety measure)
    if (this.pendingXPGains.length >= XPProgressManager.MAX_PENDING_GAINS) {
      console.warn('Maximum pending gains reached, forcing save to prevent data loss');
      this.savePendingXP().catch(console.error);
    }

    return {
      leveledUp,
      newLevel: leveledUp ? this.currentProgress.current_level : undefined,
      oldLevel: leveledUp ? oldLevel : undefined
    };
  }

  // Get current progress (always returns latest local state)
  public getCurrentProgress(): XPProgress {
    return { ...this.currentProgress };
  }

  // Get progress percentage for current level
  public getLevelProgress(): number {
    const xpNeeded = this.getXPForLevel(this.currentProgress.current_level);
    return (this.currentProgress.xp_towards_next / xpNeeded) * 100;
  }

  // Update streak (should be called daily)
  public updateStreak(practiced: boolean): void {
    const today = new Date();
    const lastPractice = this.currentProgress.last_xp_earned;
    
    if (!lastPractice) {
      this.currentProgress.streak_days = practiced ? 1 : 0;
      return;
    }

    const daysSinceLastPractice = Math.floor(
      (today.getTime() - lastPractice.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (practiced) {
      if (daysSinceLastPractice <= 1) {
        if (daysSinceLastPractice === 1) {
          this.currentProgress.streak_days++;
        }
        // If daysSinceLastPractice === 0, keep same streak (practiced same day)
      } else {
        // Streak broken
        this.currentProgress.streak_days = 1;
      }
    } else if (daysSinceLastPractice > 1) {
      // Streak broken due to inactivity
      this.currentProgress.streak_days = 0;
    }
  }

  // Reset daily XP (should be called at midnight)
  public resetDailyXP(): void {
    this.currentProgress.daily_xp_earned = 0;
  }

  // Get Supabase token using existing method pattern
  private async getSupabaseToken(): Promise<string> {
    console.log('Getting Firebase ID token...');
    const idToken = await this.user.getIdToken(true);
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    
    console.log('Calling edge function...');
    const response = await fetch(`${supabaseUrl}/functions/v1/session-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Edge function failed: ${errorData.error}`);
    }

    const data = await response.json();
    console.log('Got Supabase token');
    
    return data.access_token;
  }

  // Load progress from database
  public async loadProgress(): Promise<XPProgress> {
    try {
      const token = await this.getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_xp_progress?user_id=eq.${this.user.uid}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load progress: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.length > 0) {
        const progress = data[0];
        // Convert timestamps
        if (progress.last_xp_earned) {
          progress.last_xp_earned = new Date(progress.last_xp_earned);
        }
        if (progress.updated_at) {
          progress.updated_at = new Date(progress.updated_at);
        }
        
        this.currentProgress = progress;
        return progress;
      } else {
        // Create new progress record
        await this.createProgress();
        return this.currentProgress;
      }
    } catch (error) {
      console.error('Failed to load XP progress:', error);
      throw error;
    }
  }

  // Create initial progress record
  private async createProgress(): Promise<void> {
    try {
      const token = await this.getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const response = await fetch(`${supabaseUrl}/rest/v1/user_xp_progress`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: this.user.uid,
          current_level: 1,
          total_xp: 0,
          xp_towards_next: 0,
          daily_xp_earned: 0,
          streak_days: 0,
          last_xp_earned: null,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create progress: ${response.status}`);
      }

      console.log('Created new XP progress record');
    } catch (error) {
      console.error('Failed to create XP progress:', error);
      throw error;
    }
  }

  // Save pending XP gains to database
  public async savePendingXP(): Promise<void> {
    if (this.pendingXPGains.length === 0 || !this.isOnline || this.isDestroyed) {
      return;
    }

    try {
      const token = await this.getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const updateData = {
        current_level: this.currentProgress.current_level,
        total_xp: this.currentProgress.total_xp,
        xp_towards_next: this.currentProgress.xp_towards_next,
        daily_xp_earned: this.currentProgress.daily_xp_earned,
        streak_days: this.currentProgress.streak_days,
        last_xp_earned: this.currentProgress.last_xp_earned?.toISOString(),
        updated_at: new Date().toISOString()
      };

      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_xp_progress?user_id=eq.${this.user.uid}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save progress: ${response.status}`);
      }

      // Clear pending gains after successful save
      this.pendingXPGains = [];
      this.lastSaveTime = new Date();
      
      console.log('Saved XP progress to database');
    } catch (error) {
      console.error('Failed to save XP progress:', error);
      // Keep pending gains for retry
      throw error;
    }
  }

  // Send beacon save for page unload (more reliable for page close scenarios)
  private sendBeaconSave(): void {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      
      const updateData = {
        current_level: this.currentProgress.current_level,
        total_xp: this.currentProgress.total_xp,
        xp_towards_next: this.currentProgress.xp_towards_next,
        daily_xp_earned: this.currentProgress.daily_xp_earned,
        streak_days: this.currentProgress.streak_days,
        last_xp_earned: this.currentProgress.last_xp_earned?.toISOString(),
        updated_at: new Date().toISOString()
      };

      const blob = new Blob([JSON.stringify(updateData)], { type: 'application/json' });
      const sent = navigator.sendBeacon(
        `${supabaseUrl}/rest/v1/user_xp_progress?user_id=eq.${this.user.uid}`, 
        blob
      );
      
      if (sent) {
        console.log('Beacon save sent successfully');
        this.pendingXPGains = []; // Clear pending gains if beacon was sent
      } else {
        console.warn('Beacon save failed to send');
      }
    } catch (error) {
      console.error('Failed to send beacon save:', error);
    }
  }

  // Manual save trigger (call this before sign out)
  public async forceSave(): Promise<void> {
    return this.savePendingXP();
  }

  // Get pending XP amount
  public getPendingXP(): number {
    return this.pendingXPGains.reduce((total, gain) => total + gain.amount, 0);
  }

  // Check if there are unsaved changes
  public hasUnsavedChanges(): boolean {
    return this.pendingXPGains.length > 0;
  }

  // Set online status
  public setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
    // Don't automatically save when coming online - let the app decide when to save
  }

  // Call this method before user signs out to ensure all data is saved
  public async prepareForSignOut(): Promise<void> {
    if (this.hasUnsavedChanges()) {
      console.log('Saving XP progress before sign out...');
      await this.forceSave();
    }
  }

  // Cleanup method
  public destroy(): void {
    this.isDestroyed = true;
    
    // Final save attempt
    if (this.pendingXPGains.length > 0) {
      this.savePendingXP().catch(console.error);
    }
  }
}