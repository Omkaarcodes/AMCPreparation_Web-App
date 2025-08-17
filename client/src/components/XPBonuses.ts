//Timeline
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

  public addRawXP(amount: number): { leveledUp: boolean; newLevel?: number; oldLevel?: number } {
    return this.addXP(amount, "custom_XP_assignment");
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

   public async savePendingXP(): Promise<void> {
    if (this.pendingXPGains.length === 0 || !this.isOnline || this.isDestroyed) {
      return;
    }

    try {
      const token = await this.getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      // Helper function to safely convert to ISO string
      const toISOString = (date: Date | string | null | undefined): string | null => {
        if (!date) return null;
        if (typeof date === 'string') return date; // Already a string
        if (date instanceof Date) return date.toISOString();
        return null;
      };

      const updateData = {
        current_level: this.currentProgress.current_level,
        total_xp: this.currentProgress.total_xp,
        xp_towards_next: this.currentProgress.xp_towards_next,
        daily_xp_earned: this.currentProgress.daily_xp_earned,
        streak_days: this.currentProgress.streak_days,
        last_xp_earned: toISOString(this.currentProgress.last_xp_earned),
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

public async sendBeaconSave(): Promise<void> {
  if (this.pendingXPGains.length === 0) {
    return;
  }

  try {
    // Get the token first (this might not work during page unload)
    const token = await this.getSupabaseToken();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    // Helper function to safely convert to ISO string
    const toISOString = (date: Date | string | null | undefined): string | null => {
      if (!date) return null;
      if (typeof date === 'string') return date; // Already a string
      if (date instanceof Date) return date.toISOString();
      return null;
    };

    const updateData = {
      current_level: this.currentProgress.current_level,
      total_xp: this.currentProgress.total_xp,
      xp_towards_next: this.currentProgress.xp_towards_next,
      daily_xp_earned: this.currentProgress.daily_xp_earned,
      streak_days: this.currentProgress.streak_days,
      last_xp_earned: toISOString(this.currentProgress.last_xp_earned),
      updated_at: new Date().toISOString()
    };

    // Create a FormData object that includes the auth headers as part of the URL
    const url = new URL(`${supabaseUrl}/rest/v1/user_xp_progress`);
    url.searchParams.set('user_id', `eq.${this.user.uid}`);
    
    
    const response = await fetch(url.toString(), {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(updateData),
      keepalive: true 
    });

    if (response.ok) {
      console.log('Emergency save completed successfully');
      this.pendingXPGains = [];
    } else {
      console.warn('Emergency save failed:', response.status);
    }
  } catch (error) {
    console.error('Failed to perform emergency save:', error);
  }
}

// Alternative approach: Store data in localStorage as a fallback
public emergencyLocalSave(): void {
  try {
    const emergencyData = {
      userId: this.user.uid,
      progress: this.currentProgress,
      pendingGains: this.pendingXPGains,
      timestamp: Date.now()
    };
    
    localStorage.setItem('emergency_xp_data', JSON.stringify(emergencyData));
    console.log('🔄 Emergency XP data saved to localStorage');
  } catch (error) {
    console.error('Failed to save emergency data to localStorage:', error);
  }
}
// Method to recover from localStorage on app startup
public static async recoverEmergencyData(user: User): Promise<any> {
  try {
    const emergencyData = localStorage.getItem('emergency_xp_data');
    if (!emergencyData) return null;
    
    const data = JSON.parse(emergencyData);
    
    // Check if data belongs to current user and is recent (within last 2 hours)
    if (data.userId === user.uid && (Date.now() - data.timestamp) < 7200000) { // 2 hours
      localStorage.removeItem('emergency_xp_data'); // Clean up after recovery
      console.log('🎉 Emergency XP data recovered from localStorage');
      return data;
    }
    
    // Clean up old or invalid data
    if (data.userId === user.uid || (Date.now() - data.timestamp) > 86400000) { // 24 hours
      localStorage.removeItem('emergency_xp_data');
    }
    
    return null;
  } catch (error) {
    console.error('Failed to recover emergency data:', error);
    // Clean up corrupted data
    localStorage.removeItem('emergency_xp_data');
    return null;
  }
}

private setupPageUnloadListeners(): void {
  // Save when tab becomes hidden (user switches tabs/minimizes)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && this.pendingXPGains.length > 0) {
      this.savePendingXP().catch(() => {
        // Fallback to localStorage if network save fails
        this.emergencyLocalSave();
      });
    }
  });

  // Save before page unload (refresh, navigation, close)
  window.addEventListener('beforeunload', (event) => {
    if (this.pendingXPGains.length > 0) {
      // Just save to localStorage - it's synchronous and reliable
      this.emergencyLocalSave();
    }
  });

  // Save when user navigates using browser back/forward buttons
  window.addEventListener('popstate', () => {
    if (this.pendingXPGains.length > 0) {
      this.savePendingXP().catch(() => {
        this.emergencyLocalSave();
      });
    }
  });
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

  public setPendingGains(gains: XPGain[]): void {
    if (this.isDestroyed) {
      console.warn('Cannot set pending gains on destroyed XPProgressManager');
      return;
    }
    
    // Directly set the pending gains without re-applying them
    // This is used during emergency recovery to restore the unsaved state
    this.pendingXPGains = [...gains];
    
    console.log(`Set ${gains.length} pending XP gains for recovery`);
  }

  // Call this method before user signs out to ensure all data is saved
 public async prepareForSignOut(): Promise<void> {
    if (this.hasUnsavedChanges()) {
        console.log('Saving XP progress before sign out...');
        try {
            await this.forceSave();
            console.log('XP progress saved successfully before sign out');
        } catch (error) {
            console.error('Failed to save XP before sign out:', error);
            // Try localStorage save as fallback
            this.emergencyLocalSave();
        }
    }
}

public manualEmergencySave(): void {
  this.emergencyLocalSave();
}

public static clearEmergencyData(): void {
  try {
    localStorage.removeItem('emergency_xp_data');
    console.log('🧹 Emergency XP data cleared');
  } catch (error) {
    console.error('Failed to clear emergency data:', error);
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