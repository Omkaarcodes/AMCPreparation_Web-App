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
  last_daily_reset?: Date;
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
  public isDestroyed: boolean = false;
  private needsDailyResetSave: boolean = false;
  private dailyResetProcessed: boolean = false;

  // XP Constants
  private static readonly BASE_XP_PER_LEVEL = 100;
  private static readonly XP_MULTIPLIER = 1.2;
  private static readonly MAX_PENDING_GAINS = 100;

  constructor(user: User, initialProgress?: XPProgress) {
    this.user = user;
    this.currentProgress = initialProgress || this.getDefaultProgress();
    this.setupPageUnloadListeners();
  }

  private getDefaultProgress(): XPProgress {
    const now = new Date();
    return {
      user_id: this.user.uid,
      current_level: 1,
      total_xp: 0,
      xp_towards_next: 0,
      daily_xp_earned: 0,
      streak_days: 0,
      last_daily_reset: this.getStartOfDay(now)
    };
  }

  // Helper method to get start of day for consistent date comparisons
  private getStartOfDay(date: Date): Date {
  // Always use UTC to avoid timezone issues
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

  // Helper method to safely parse dates
  private parseDate(dateInput: Date | string | null | undefined): Date | null {
    if (!dateInput) return null;
    
    let parsedDate: Date;
    
    if (typeof dateInput === 'string') {
      parsedDate = new Date(dateInput);
      if (isNaN(parsedDate.getTime())) return null;
    } else if (dateInput instanceof Date) {
      if (isNaN(dateInput.getTime())) return null;
      parsedDate = dateInput;
    } else {
      return null;
    }
    
    // Convert to UTC if not already
    return new Date(parsedDate.getTime());
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

  // Improved daily reset logic
  public checkAndResetDailyProgress(): boolean {
  if (this.dailyResetProcessed) {
    return false;
  }

  const todayUTC = this.getStartOfDay(new Date());
  const lastReset = this.parseDate(this.currentProgress.last_daily_reset);
  const lastResetStartUTC = lastReset ? this.getStartOfDay(lastReset) : null;

  const shouldReset = !lastResetStartUTC || todayUTC.getTime() !== lastResetStartUTC.getTime();
  
  if (shouldReset) {
    const previousDailyXP = this.currentProgress.daily_xp_earned;
    
    console.log('🔄 Resetting daily XP for new day', {
      todayUTC: todayUTC.toISOString(),
      lastResetUTC: lastResetStartUTC?.toISOString() || 'never',
      previousDailyXP
    });
    
    this.currentProgress.daily_xp_earned = 0;
    this.currentProgress.last_daily_reset = todayUTC;
    this.needsDailyResetSave = true;
    this.dailyResetProcessed = true;
    
    return true;
  }
  
  this.dailyResetProcessed = true;
  return false;
}


  // Check if two dates are the same day
  public isSameDay(date1: Date, date2: Date): boolean {
    const day1UTC = this.getStartOfDay(date1);
    const day2UTC = this.getStartOfDay(date2);
    return day1UTC.getTime() === day2UTC.getTime();
}

  // Add XP and handle level ups
  public addXP(amount: number, source: string): { leveledUp: boolean; newLevel?: number; oldLevel?: number } {
    if (this.isDestroyed) {
      console.warn('Cannot add XP to destroyed XPProgressManager');
      return { leveledUp: false };
    }

    if (amount <= 0) {
      console.warn('XP amount must be positive');
      return { leveledUp: false };
    }

    const oldLevel = this.currentProgress.current_level;
    const now = new Date();
    
    // Update streak BEFORE updating last_xp_earned
    this.updateStreak(now);
    
    // Add to pending gains
    this.pendingXPGains.push({
      amount,
      source,
      timestamp: now
    });

    // Update local progress immediately for UI responsiveness
    this.currentProgress.total_xp += amount;
    this.currentProgress.xp_towards_next += amount;
    this.currentProgress.daily_xp_earned += amount;
    this.currentProgress.last_xp_earned = now;

    // Check for level up
    let leveledUp = false;
    while (this.currentProgress.xp_towards_next >= this.getXPForLevel(this.currentProgress.current_level)) {
      this.currentProgress.xp_towards_next -= this.getXPForLevel(this.currentProgress.current_level);
      this.currentProgress.current_level++;
      leveledUp = true;
    }

    // Force save if we've reached the maximum pending gains limit
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
    return xpNeeded > 0 ? (this.currentProgress.xp_towards_next / xpNeeded) * 100 : 0;
  }

  // Fixed streak update logic
  public updateStreak(earnedToday: Date = new Date()): void {
  const todayUTC = this.getStartOfDay(earnedToday);
  const lastXPDate = this.parseDate(this.currentProgress.last_xp_earned);
  
  if (!lastXPDate) {
    this.currentProgress.streak_days = 1;
    console.log('🔥 Starting new streak: 1 day');
    return;
  }

  const lastXPStartUTC = this.getStartOfDay(lastXPDate);
  const daysDiff = Math.floor((todayUTC.getTime() - lastXPStartUTC.getTime()) / (1000 * 60 * 60 * 24));
  
  // Handle negative day difference (time inconsistency)
  if (daysDiff < 0) {
    console.warn('🔥 Time inconsistency detected (negative day diff):', daysDiff, {
      todayUTC: todayUTC.toISOString(),
      lastXPStartUTC: lastXPStartUTC.toISOString()
    });
    // Don't change streak when time goes backwards
    return;
  }
  
  if (daysDiff === 0) {
    if (this.currentProgress.streak_days === 0) {
      this.currentProgress.streak_days = 1;
      console.log('🔥 Fixed zero streak - set to 1 day (same day XP)');
    } else {
      console.log('🔥 Same day XP - streak maintained:', this.currentProgress.streak_days);
    }
  } else if (daysDiff === 1) {
    this.currentProgress.streak_days += 1;
    console.log('🔥 Streak continued:', this.currentProgress.streak_days, 'days');
  } else if (daysDiff > 1) {
    this.currentProgress.streak_days = 1;
    console.log('🔥 Streak reset to 1 day due to', daysDiff, 'day gap');
  }
}

  // Get Supabase token
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
        
        // Convert timestamps safely
        progress.last_xp_earned = this.parseDate(progress.last_xp_earned);
        progress.last_daily_reset = this.parseDate(progress.last_daily_reset);
        progress.updated_at = this.parseDate(progress.updated_at);
        
        // Ensure last_daily_reset exists and is valid
        if (!progress.last_daily_reset) {
          progress.last_daily_reset = this.getStartOfDay(new Date());
          this.needsDailyResetSave = true;
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

      const now = new Date();
      const startOfToday = this.getStartOfDay(now);
      
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
          last_daily_reset: startOfToday.toISOString(),
          updated_at: now.toISOString()
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

  // Save pending XP with improved logic
  public async savePendingXP(): Promise<void> {
  if (this.pendingXPGains.length === 0 && !this.needsDailyResetSave) {
    return;
  }

  if (!this.isOnline || this.isDestroyed) {
    console.warn('Cannot save - offline or destroyed');
    return;
  }

  try {
    const token = await this.getSupabaseToken();
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

    // Helper function to safely convert to UTC ISO string
    const toUTCISOString = (date: Date | string | null | undefined): string | null => {
      if (!date) return null;
      
      let parsedDate: Date;
      if (typeof date === 'string') {
        parsedDate = new Date(date);
      } else if (date instanceof Date) {
        parsedDate = date;
      } else {
        return null;
      }
      
      if (isNaN(parsedDate.getTime())) return null;
      return parsedDate.toISOString(); // This is always UTC
    };

    const updateData = {
      current_level: this.currentProgress.current_level,
      total_xp: this.currentProgress.total_xp,
      xp_towards_next: this.currentProgress.xp_towards_next,
      daily_xp_earned: this.currentProgress.daily_xp_earned,
      streak_days: this.currentProgress.streak_days,
      last_xp_earned: toUTCISOString(this.currentProgress.last_xp_earned),
      last_daily_reset: toUTCISOString(this.currentProgress.last_daily_reset),
      updated_at: new Date().toISOString() // Always UTC
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

    this.pendingXPGains = [];
    this.needsDailyResetSave = false;
    this.lastSaveTime = new Date();
    
    console.log('Saved XP progress to database (UTC)');
  } catch (error) {
    console.error('Failed to save XP progress:', error);
    throw error;
  }
}

  // Emergency save methods
  public emergencyLocalSave(): void {
    try {
      const emergencyData = {
        userId: this.user.uid,
        progress: {
          ...this.currentProgress,
          last_xp_earned: this.currentProgress.last_xp_earned?.toISOString() || null,
          last_daily_reset: this.currentProgress.last_daily_reset?.toISOString() || null,
          updated_at: this.currentProgress.updated_at?.toISOString() || null
        },
        pendingGains: this.pendingXPGains.map(gain => ({
          ...gain,
          timestamp: gain.timestamp.toISOString()
        })),
        needsDailyResetSave: this.needsDailyResetSave,
        timestamp: Date.now()
      };
      
      localStorage.setItem('emergency_xp_data', JSON.stringify(emergencyData));
      console.log('🔄 Emergency XP data saved to localStorage');
    } catch (error) {
      console.error('Failed to save emergency data to localStorage:', error);
    }
  }

  // Recovery method
  public static async recoverEmergencyData(user: User): Promise<any> {
    try {
      const emergencyData = localStorage.getItem('emergency_xp_data');
      if (!emergencyData) return null;
      
      const data = JSON.parse(emergencyData);
      
      // Check if data belongs to current user and is recent (within last 2 hours)
      if (data.userId === user.uid && (Date.now() - data.timestamp) < 7200000) {
        localStorage.removeItem('emergency_xp_data');
        console.log('🎉 Emergency XP data recovered from localStorage');
        
        // Convert date strings back to Date objects
        if (data.progress.last_xp_earned) {
          data.progress.last_xp_earned = new Date(data.progress.last_xp_earned);
        }
        if (data.progress.last_daily_reset) {
          data.progress.last_daily_reset = new Date(data.progress.last_daily_reset);
        }
        if (data.progress.updated_at) {
          data.progress.updated_at = new Date(data.progress.updated_at);
        }
        
        // Convert pending gains timestamps
        if (data.pendingGains) {
          data.pendingGains = data.pendingGains.map((gain: any) => ({
            ...gain,
            timestamp: new Date(gain.timestamp)
          }));
        }
        
        return data;
      }
      
      // Clean up old or invalid data
      if (data.userId === user.uid || (Date.now() - data.timestamp) > 86400000) {
        localStorage.removeItem('emergency_xp_data');
      }
      
      return null;
    } catch (error) {
      console.error('Failed to recover emergency data:', error);
      localStorage.removeItem('emergency_xp_data');
      return null;
    }
  }

  // Setup page unload listeners
  private setupPageUnloadListeners(): void {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && (this.pendingXPGains.length > 0 || this.needsDailyResetSave)) {
        this.savePendingXP().catch(() => {
          this.emergencyLocalSave();
        });
      }
    });

    window.addEventListener('beforeunload', () => {
      if (this.pendingXPGains.length > 0 || this.needsDailyResetSave) {
        this.emergencyLocalSave();
      }
    });

    window.addEventListener('popstate', () => {
      if (this.pendingXPGains.length > 0 || this.needsDailyResetSave) {
        this.savePendingXP().catch(() => {
          this.emergencyLocalSave();
        });
      }
    });
  }

  // Public utility methods
  public async forceSave(): Promise<void> {
    return this.savePendingXP();
  }

  public getPendingXP(): number {
    return this.pendingXPGains.reduce((total, gain) => total + gain.amount, 0);
  }

  public hasUnsavedChanges(): boolean {
    return this.pendingXPGains.length > 0 || this.needsDailyResetSave;
  }

  public setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  public setPendingGains(gains: XPGain[]): void {
    if (this.isDestroyed) {
      console.warn('Cannot set pending gains on destroyed XPProgressManager');
      return;
    }
    
    this.pendingXPGains = [...gains];
    console.log(`Set ${gains.length} pending XP gains for recovery`);
  }

  public setNeedsDailyResetSave(needs: boolean): void {
    this.needsDailyResetSave = needs;
  }

  public async prepareForSignOut(): Promise<void> {
    if (this.hasUnsavedChanges()) {
      console.log('Saving XP progress before sign out...');
      try {
        await this.forceSave();
        console.log('XP progress saved successfully before sign out');
      } catch (error) {
        console.error('Failed to save XP before sign out:', error);
        this.emergencyLocalSave();
      }
    }
  }

  public static clearEmergencyData(): void {
    try {
      localStorage.removeItem('emergency_xp_data');
      console.log('🧹 Emergency XP data cleared');
    } catch (error) {
      console.error('Failed to clear emergency data:', error);
    }
  }

  // Reset daily progress flag for new sessions
  public resetDailyProcessedFlag(): void {
    this.dailyResetProcessed = false;
  }

  public destroy(): void {
    this.isDestroyed = true;
    
    if (this.hasUnsavedChanges()) {
      this.savePendingXP().catch(() => {
        this.emergencyLocalSave();
      });
    }
    console.log('XP Manager for current user destroyed!');
  }
}