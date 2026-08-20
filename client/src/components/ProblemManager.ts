// client/src/components/ProblemAnalytics.ts
import { User } from 'firebase/auth';

export interface ProblemStats {
  user_id: string;
  total_problems_solved: number;
  daily_problems_solved: number;
  weekly_problems_solved: number;
  monthly_problems_solved: number;
  total_attempts: number;
  correct_attempts: number;
  average_accuracy: number;
  last_problem_solved?: Date;
  last_daily_reset?: Date;
  problems_by_topic: Record<string, {
    solved: number;
    attempts: number;
    accuracy: number;
    difficulty_breakdown: Record<string, number>;
    sources: Record<string, {
      solved: number;
      attempts: number;
      accuracy: number;
    }>;
  }>;
  difficulty_stats: Record<string, {
    solved: number;
    attempts: number;
    accuracy: number;
  }>;
  problem_collections?: any;
  problems_bookmarked?: string;
  problem_timings_record?: Record<string, DailyTimingRecord>; // New field
}

export interface ProblemAttempt {
  problemId: string;
  topic: string;
  difficulty: number;
  source: string;
  isCorrect: boolean;
  timeSpent: number;
  answerGiven: string;
  xpEarned?: number;
  attemptedAt: Date;
}

export interface DailyProblemData {
  date: string;
  solved: number;
  attempts: number;
  accuracy: number;
}

// New interface for daily timing records
export interface DailyTimingRecord {
  date: string;
  problems_solved: string[]; // Array of problem IDs
  total_solved: number;
  total_attempts: number;
  accuracy: number;
  total_time_spent: number; // in seconds
  average_time_per_problem: number;
}

export class ProblemAnalyticsManager {
  private user: User;
  private currentStats: ProblemStats;
  private pendingAttempts: ProblemAttempt[] = [];
  private isOnline: boolean = true;
  public isDestroyed: boolean = false;
  private needsDailyResetSave: boolean = false;
  private dailyResetProcessed: boolean = false; // Key fix: prevent multiple resets per session

  constructor(user: User, initialStats?: ProblemStats) {
    this.user = user;
    this.currentStats = initialStats || this.getDefaultStats();
  }

  private getDefaultStats(): ProblemStats {
    const now = new Date();
    return {
      user_id: this.user.uid,
      total_problems_solved: 0,
      daily_problems_solved: 0,
      weekly_problems_solved: 0,
      monthly_problems_solved: 0,
      total_attempts: 0,
      correct_attempts: 0,
      average_accuracy: 0,
      last_daily_reset: this.getStartOfDay(now),
      problems_by_topic: {},
      difficulty_stats: {},
      problem_collections: {},
      problems_bookmarked: '',
      problem_timings_record: {}
    };
  }

  // Helper method to get start of day for consistent date comparisons
  private getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  // Helper method to safely parse dates - returns undefined to match interface
  private parseDate(dateInput: Date | string | null | undefined): Date | undefined {
  if (!dateInput) return undefined;
  
  if (typeof dateInput === 'string') {
    // Check if it's a date-only string (YYYY-MM-DD format from database)
    const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateOnlyRegex.test(dateInput)) {
      // Parse as local date to avoid timezone issues
      const [year, month, day] = dateInput.split('-').map(Number);
      const parsed = new Date(year, month - 1, day); // month is 0-indexed
      return isNaN(parsed.getTime()) ? undefined : parsed;
    } else {
      // Handle full datetime strings normally
      const parsed = new Date(dateInput);
      return isNaN(parsed.getTime()) ? undefined : parsed;
    }
  }
  
  if (dateInput instanceof Date) {
    return isNaN(dateInput.getTime()) ? undefined : dateInput;
  }
  
  return undefined;
  }

  // Fixed daily reset logic - mirrors XP manager approach
  public checkAndResetDaily(): boolean {
    if (this.dailyResetProcessed) {
      return false; // Already processed for this session - key fix!
    }

    const today = this.getStartOfDay(new Date());
    const lastDailyReset = this.parseDate(this.currentStats.last_daily_reset);
    const lastDailyStart = lastDailyReset ? this.getStartOfDay(lastDailyReset) : null;

    let resetOccurred = false;

    // Only reset if it's truly a different day
    if (!lastDailyStart || today.getTime() !== lastDailyStart.getTime()) {
      console.log('🔄 Resetting daily problem stats for new day', {
        today: today.toDateString(),
        lastReset: lastDailyStart?.toDateString() || 'never',
        previousDaily: this.currentStats.daily_problems_solved
      });
      
      this.currentStats.daily_problems_solved = 0;
      this.currentStats.last_daily_reset = today;
      this.needsDailyResetSave = true;
      resetOccurred = true;
    }

    this.dailyResetProcessed = true; // Mark as processed for this session
    return resetOccurred;
  }


  // Enhanced record attempt with timing tracking
  public recordAttempt(attempt: ProblemAttempt): void {
      if (this.isDestroyed) {
        console.warn('Cannot record attempt on destroyed ProblemAnalyticsManager');
        return;
      }

      // Ensure attemptedAt is set
      if (!attempt.attemptedAt) {
        attempt.attemptedAt = new Date();
      }

      // Add to pending attempts
      this.pendingAttempts.push(attempt);

      // Update timing records
      this.updateTimingRecord(attempt);

      // Update local stats immediately
      this.currentStats.total_attempts++;
      
      if (attempt.isCorrect) {
        this.currentStats.correct_attempts++;
        this.currentStats.total_problems_solved++;
        this.currentStats.daily_problems_solved++;
        this.currentStats.last_problem_solved = new Date();
      }

      // Update topic stats (now including source and difficulty info)
      if (!this.currentStats.problems_by_topic) {
        this.currentStats.problems_by_topic = {};
      }
      if (!this.currentStats.problems_by_topic[attempt.topic]) {
        this.currentStats.problems_by_topic[attempt.topic] = { 
          solved: 0, 
          attempts: 0, 
          accuracy: 0,
          difficulty_breakdown: {},
          sources: {}
        };
      }
      
      const topicStats = this.currentStats.problems_by_topic[attempt.topic];
      topicStats.attempts++;
      if (attempt.isCorrect) {
        topicStats.solved++;
      }
      topicStats.accuracy = (topicStats.solved / topicStats.attempts) * 100;

      // Track difficulty breakdown within topic
      const difficultyKey = attempt.difficulty.toFixed(1);
      if (!topicStats.difficulty_breakdown) {
        topicStats.difficulty_breakdown = {};
      }
      if (!topicStats.difficulty_breakdown[difficultyKey]) {
        topicStats.difficulty_breakdown[difficultyKey] = 0;
      }
      if (attempt.isCorrect) {
        topicStats.difficulty_breakdown[difficultyKey]++;
      }

      // Track source stats within topic
      if (!topicStats.sources) {
        topicStats.sources = {};
      }
      if (!topicStats.sources[attempt.source]) {
        topicStats.sources[attempt.source] = { solved: 0, attempts: 0, accuracy: 0 };
      }
      topicStats.sources[attempt.source].attempts++;
      if (attempt.isCorrect) {
        topicStats.sources[attempt.source].solved++;
      }
      topicStats.sources[attempt.source].accuracy = 
        (topicStats.sources[attempt.source].solved / topicStats.sources[attempt.source].attempts) * 100;

      if (!this.currentStats.difficulty_stats) {
        this.currentStats.difficulty_stats = {};
      }
      
      if (!this.currentStats.difficulty_stats[difficultyKey]) {
        this.currentStats.difficulty_stats[difficultyKey] = { solved: 0, attempts: 0, accuracy: 0 };
      }
      
      // Final safety check before accessing
      const diffStats = this.currentStats.difficulty_stats[difficultyKey];
      if (diffStats) {
        diffStats.attempts++;
        if (attempt.isCorrect) {
          diffStats.solved++;
        }
        diffStats.accuracy = (diffStats.solved / diffStats.attempts) * 100;
      } else {
        // Fallback: recreate the stats object if somehow it's still undefined
        console.warn('Difficulty stats object corrupted, recreating...');
        this.currentStats.difficulty_stats[difficultyKey] = {
          solved: attempt.isCorrect ? 1 : 0,
          attempts: 1,
          accuracy: attempt.isCorrect ? 100 : 0
        };
      }

      // Update overall accuracy
      this.currentStats.average_accuracy = 
        (this.currentStats.correct_attempts / this.currentStats.total_attempts) * 100;
}



  // New method to update timing records
  private updateTimingRecord(attempt: ProblemAttempt): void {
    const today = this.getStartOfDay(attempt.attemptedAt);
    const dateKey = today.toISOString().split('T')[0]; // YYYY-MM-DD format

    // Initialize timing records if not exists
    if (!this.currentStats.problem_timings_record) {
      this.currentStats.problem_timings_record = {};
    }

    // Get or create today's record
    if (!this.currentStats.problem_timings_record[dateKey]) {
      this.currentStats.problem_timings_record[dateKey] = {
        date: dateKey,
        problems_solved: [],
        total_solved: 0,
        total_attempts: 0,
        accuracy: 0,
        total_time_spent: 0,
        average_time_per_problem: 0
      };
    }

    const todayRecord = this.currentStats.problem_timings_record[dateKey];
    
    // Update the record
    todayRecord.total_attempts++;
    todayRecord.total_time_spent += attempt.timeSpent;
    
    if (attempt.isCorrect) {
      todayRecord.total_solved++;
      // Only add to problems_solved if it's a correct attempt and not already recorded
      if (!todayRecord.problems_solved.includes(attempt.problemId)) {
        todayRecord.problems_solved.push(attempt.problemId);
      }
    }
    
    // Recalculate metrics
    todayRecord.accuracy = todayRecord.total_attempts > 0 ? 
      (todayRecord.total_solved / todayRecord.total_attempts) * 100 : 0;
    todayRecord.average_time_per_problem = todayRecord.total_solved > 0 ? 
      todayRecord.total_time_spent / todayRecord.total_solved : 0;

    // Keep only last 90 days of timing data to prevent excessive growth
    this.pruneOldTimingRecords();
  }

  // Clean up old timing records
  private pruneOldTimingRecords(): void {
    if (!this.currentStats.problem_timings_record) return;

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const cutoffDate = ninetyDaysAgo.toISOString().split('T')[0];

    Object.keys(this.currentStats.problem_timings_record).forEach(dateKey => {
      if (dateKey < cutoffDate) {
        delete this.currentStats.problem_timings_record![dateKey];
      }
    });
  }

  // Get Supabase token (same as XP manager)
  private async getSupabaseToken(): Promise<string> {
    console.log('Getting Firebase ID token for problem stats...');
    const idToken = await this.user.getIdToken(true);
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    
    console.log('Calling edge function for problem stats...');
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
    console.log('Got Supabase token for problem stats');
    
    return data.access_token;
  }

  // Load problem stats from database
  public async loadStats(): Promise<ProblemStats> {
    try {
      const token = await this.getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${this.user.uid}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to load problem stats: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.length > 0) {
        const dbStats = data[0];
        
        // Parse and validate the loaded data according to your actual schema
        this.currentStats = {
          user_id: this.user.uid,
          total_problems_solved: dbStats.total_problems_solved || 0,
          daily_problems_solved: dbStats.daily_problems_solved || 0,
          weekly_problems_solved: dbStats.weekly_problems_solved || 0,
          monthly_problems_solved: dbStats.monthly_problems_solved || 0,
          total_attempts: dbStats.total_attempts || 0,
          correct_attempts: dbStats.correct_attempts || 0,
          average_accuracy: parseFloat(dbStats.average_accuracy || '0'),
          last_problem_solved: this.parseDate(dbStats.last_problem_solved),
          last_daily_reset: this.parseDate(dbStats.last_daily_reset) || this.getStartOfDay(new Date()),
          problems_by_topic: dbStats.problems_by_topic || {},
          difficulty_stats: dbStats.difficulty_stats || {},
          problem_collections: dbStats.problem_collections || {},
          problems_bookmarked: dbStats.problems_bookmarked || '',
          problem_timings_record: dbStats.problem_timings_record || {} // Load timing records
        };

        console.log('Problem stats loaded successfully from database');
        return this.currentStats;
      } else {
        // No existing record, create one
        console.log('No existing problem stats found, creating new record');
        await this.createStats();
        return this.currentStats;
      }
    } catch (error) {
      console.error('Failed to load problem stats:', error);
      throw error;
    }
  }

  // Create initial problem stats record
  private async createStats(): Promise<void> {
    try {
      const token = await this.getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const now = new Date();
      const startOfToday = this.getStartOfDay(now);
      
      const response = await fetch(`${supabaseUrl}/rest/v1/user_problem_data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          user_id: this.user.uid,
          total_problems_solved: 0,
          daily_problems_solved: 0,
          weekly_problems_solved: 0,
          monthly_problems_solved: 0,
          total_attempts: 0,
          correct_attempts: 0,
          average_accuracy: 0.00,
          last_daily_reset: startOfToday.toISOString().split('T')[0], // date format
          problems_by_topic: {},
          difficulty_stats: {},
          problem_collections: {},
          problems_bookmarked: '',
          problem_timings_record: {}, // Initialize timing records
          created_at: now.toISOString(),
          updated_at: now.toISOString()
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to create problem stats: ${response.statusText} - ${errorText}`);
      }

      console.log('Created new problem stats record');
    } catch (error) {
      console.error('Failed to create problem stats:', error);
      throw error;
    }
  }

  // Save pending attempts and stats to database
  public async saveStats(): Promise<void> {
    if (this.pendingAttempts.length === 0 && !this.needsDailyResetSave) {
      return;
    }

    if (!this.isOnline || this.isDestroyed) {
      console.warn('Cannot save problem stats - offline or destroyed');
      return;
    }

    try {
      const token = await this.getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const toISOString = (date: Date | string | null | undefined): string | null => {
        if (!date) return null;
        
        try {
          if (typeof date === 'string') {
            const parsed = new Date(date);
            return isNaN(parsed.getTime()) ? null : parsed.toISOString();
          }
          
          if (date instanceof Date) {
            return isNaN(date.getTime()) ? null : date.toISOString();
          }
        } catch (error) {
          console.warn('Error converting date to ISO string:', error);
        }
        
        return null;
      };

      // Helper function to format date for PostgreSQL date column
      const toDateString = (date: Date | string | null | undefined): string | null => {
        if (!date) return null;
        
        try {
          let dateObj: Date;
          if (typeof date === 'string') {
            dateObj = new Date(date);
          } else if (date instanceof Date) {
            dateObj = date;
          } else {
            return null;
          }
          
          if (isNaN(dateObj.getTime())) return null;
          
          // Return YYYY-MM-DD format for PostgreSQL date column
          return dateObj.toISOString().split('T')[0];
        } catch (error) {
          console.warn('Error converting date to string:', error);
          return null;
        }
      };

      // Update main stats in user_problem_data table (including new timing records)
      const updateData = {
        total_problems_solved: this.currentStats.total_problems_solved,
        daily_problems_solved: this.currentStats.daily_problems_solved,
        weekly_problems_solved: this.currentStats.weekly_problems_solved,
        monthly_problems_solved: this.currentStats.monthly_problems_solved,
        total_attempts: this.currentStats.total_attempts,
        correct_attempts: this.currentStats.correct_attempts,
        average_accuracy: this.currentStats.average_accuracy,
        last_problem_solved: toISOString(this.currentStats.last_problem_solved),
        last_daily_reset: toDateString(this.currentStats.last_daily_reset),
        problems_by_topic: this.currentStats.problems_by_topic,
        difficulty_stats: this.currentStats.difficulty_stats,
        problem_collections: this.currentStats.problem_collections,
        problems_bookmarked: this.currentStats.problems_bookmarked,
        problem_timings_record: this.currentStats.problem_timings_record || {}, // Save timing records
        updated_at: new Date().toISOString()
      };

      const statsResponse = await fetch(
        `${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${this.user.uid}`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'apikey': anonKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateData)
        }
      );

      if (!statsResponse.ok) {
        const errorText = await statsResponse.text();
        throw new Error(`Failed to update problem stats: ${statsResponse.statusText} - ${errorText}`);
      }

      // Clear pending data on successful save
      this.pendingAttempts = [];
      this.needsDailyResetSave = false;

      console.log(`Problem stats saved successfully (${this.currentStats.total_problems_solved} total solved)`);

    } catch (error) {
      console.error('Failed to save problem stats:', error);
      
      // Emergency local save if available
      this.emergencyLocalSave();
      
      throw error;
    }
  }

  // Analytics methods
  public getTopTopics(limit: number = 5): Array<{topic: string, solved: number, accuracy: number}> {
    return Object.entries(this.currentStats.problems_by_topic)
      .map(([topic, stats]) => ({
        topic,
        solved: stats.solved,
        accuracy: stats.accuracy
      }))
      .sort((a, b) => b.solved - a.solved)
      .slice(0, limit);
  }

  public getDifficultyDistribution(): Array<{difficulty: string, solved: number, attempts: number, accuracy: number}> {
    return Object.entries(this.currentStats.difficulty_stats)
      .map(([difficulty, stats]) => ({
        difficulty,
        solved: stats.solved,
        attempts: stats.attempts,
        accuracy: stats.accuracy
      }))
      .sort((a, b) => parseFloat(a.difficulty) - parseFloat(b.difficulty));
  }

  public getTopicBreakdown(): Array<{topic: string, count: number, percentage: number}> {
    const totalSolved = this.currentStats.total_problems_solved;
    
    return Object.entries(this.currentStats.problems_by_topic)
      .map(([topic, stats]) => ({
        topic,
        count: stats.solved,
        percentage: totalSolved > 0 ? Math.round((stats.solved / totalSolved) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }

  public getSourceAnalysis(): Array<{source: string, solved: number, attempts: number, accuracy: number}> {
    // Aggregate from problems_by_topic
    const sourceAggregation: Record<string, {solved: number, attempts: number, accuracy: number}> = {};
    
    Object.values(this.currentStats.problems_by_topic).forEach(topicStats => {
      Object.entries(topicStats.sources || {}).forEach(([source, sourceStats]) => {
        if (!sourceAggregation[source]) {
          sourceAggregation[source] = { solved: 0, attempts: 0, accuracy: 0 };
        }
        sourceAggregation[source].solved += sourceStats.solved;
        sourceAggregation[source].attempts += sourceStats.attempts;
      });
    });

    // Recalculate accuracy for each source
    Object.values(sourceAggregation).forEach(stats => {
      stats.accuracy = stats.attempts > 0 ? (stats.solved / stats.attempts) * 100 : 0;
    });

    return Object.entries(sourceAggregation)
      .map(([source, stats]) => ({
        source,
        solved: stats.solved,
        attempts: stats.attempts,
        accuracy: stats.accuracy
      }))
      .sort((a, b) => b.solved - a.solved);
  }

  // Enhanced past 30 days data using timing records
  public async getPast30DaysData(): Promise<DailyProblemData[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    
    return Array.from({ length: 30 }, (_, i) => {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      const timingRecord = this.currentStats.problem_timings_record?.[dateKey];
      
      return {
        date: dateKey,
        solved: timingRecord?.total_solved || 0,
        attempts: timingRecord?.total_attempts || 0,
        accuracy: timingRecord?.accuracy || 0
      };
    });
  }

  // New analytics methods for timing data
  public getTimingInsights(): {
    averageTimePerProblem: number;
    totalTimeSpent: number;
    mostProductiveDay: string | null;
    recentPerformanceTrend: string; // 'improving', 'declining', 'stable'
  } {
    if (!this.currentStats.problem_timings_record) {
      return {
        averageTimePerProblem: 0,
        totalTimeSpent: 0,
        mostProductiveDay: null,
        recentPerformanceTrend: 'stable'
      };
    }

    const records = Object.values(this.currentStats.problem_timings_record);
    
    // Calculate overall metrics
    const totalTime = records.reduce((sum, record) => sum + record.total_time_spent, 0);
    const totalSolved = records.reduce((sum, record) => sum + record.total_solved, 0);
    const avgTime = totalSolved > 0 ? totalTime / totalSolved : 0;

    // Find most productive day
    let mostProductiveDay = null;
    let maxSolved = 0;
    records.forEach(record => {
      if (record.total_solved > maxSolved) {
        maxSolved = record.total_solved;
        mostProductiveDay = record.date;
      }
    });

   

    // Analyze recent trend (last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentWeek = records.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= sevenDaysAgo;
    });
    const previousWeek = records.filter(r => {
      const recordDate = new Date(r.date);
      return recordDate >= fourteenDaysAgo && recordDate < sevenDaysAgo;
    });

    const recentAvgAccuracy = recentWeek.length > 0 ? 
      recentWeek.reduce((sum, r) => sum + r.accuracy, 0) / recentWeek.length : 0;
    const previousAvgAccuracy = previousWeek.length > 0 ? 
      previousWeek.reduce((sum, r) => sum + r.accuracy, 0) / previousWeek.length : 0;

    let trend = 'stable';
    if (recentWeek.length > 0 && previousWeek.length > 0) {
      const improvement = recentAvgAccuracy - previousAvgAccuracy;
      if (improvement > 5) trend = 'improving';
      else if (improvement < -5) trend = 'declining';
    }

    return {
      averageTimePerProblem: Math.round(avgTime),
      totalTimeSpent: Math.round(totalTime),
      mostProductiveDay,
      recentPerformanceTrend: trend
    };
  }

  public getRecentTimingData(days: number = 7): DailyTimingRecord[] {
    if (!this.currentStats.problem_timings_record) return [];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days + 1);
    const cutoffStr = cutoffDate.toISOString().split('T')[0];

    return Object.values(this.currentStats.problem_timings_record)
      .filter(record => record.date >= cutoffStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }


  // Emergency save methods
  public emergencyLocalSave(): void {
    try {
      const emergencyData = {
        stats: {
          ...this.currentStats,
          last_problem_solved: this.currentStats.last_problem_solved?.toISOString() || null,
          last_daily_reset: this.currentStats.last_daily_reset?.toISOString() || null
        },
        pendingAttempts: this.pendingAttempts.map(attempt => ({
          ...attempt,
          attemptedAt: attempt.attemptedAt.toISOString()
        })),
        needsDailyResetSave: this.needsDailyResetSave,
        timestamp: Date.now(),
        userId: this.user.uid
      };

      localStorage.setItem(`emergency_problem_stats_${this.user.uid}`, JSON.stringify(emergencyData));
      console.log('Emergency problem stats saved to localStorage');
    } catch (error) {
      console.error('Failed to save emergency problem stats:', error);
    }
  }

  // Recovery method
  public static async recoverEmergencyData(user: User): Promise<any> {
    const emergencyKey = `emergency_problem_stats_${user.uid}`;
    
    try {
      const emergencyDataStr = localStorage.getItem(emergencyKey);
      
      if (!emergencyDataStr) {
        return null;
      }

      let emergencyData;
      try {
        emergencyData = JSON.parse(emergencyDataStr);
      } catch (parseError) {
        console.error('Invalid emergency data format, removing:', parseError);
        localStorage.removeItem(emergencyKey);
        return null;
      }
      
      // Always remove from localStorage after reading, regardless of validity
      localStorage.removeItem(emergencyKey);
      
      // Check if data is recent (within last 24 hours) and belongs to current user
      const dataAge = Date.now() - emergencyData.timestamp;
      if (emergencyData.userId === user.uid && dataAge < 24 * 60 * 60 * 1000) {
        console.log('Found recent emergency problem stats data - recovering');
        
        // Convert date strings back to Date objects
        if (emergencyData.stats.last_problem_solved) {
          emergencyData.stats.last_problem_solved = new Date(emergencyData.stats.last_problem_solved);
        } else {
          emergencyData.stats.last_problem_solved = null;
        }
        
        if (emergencyData.stats.last_daily_reset) {
          emergencyData.stats.last_daily_reset = new Date(emergencyData.stats.last_daily_reset);
        } else {
          emergencyData.stats.last_daily_reset = null;
        }
        
        // Convert pending attempts timestamps
        if (emergencyData.pendingAttempts) {
          emergencyData.pendingAttempts = emergencyData.pendingAttempts.map((attempt: any) => ({
            ...attempt,
            attemptedAt: new Date(attempt.attemptedAt)
          }));
        }
        
        return emergencyData;
      } else {
        console.log('Emergency problem stats data too old or for different user, discarded');
        return null;
      }
      
    } catch (error) {
      console.error('Error recovering emergency problem stats:', error);
      // Ensure cleanup even if there's an error
      try {
        localStorage.removeItem(emergencyKey);
      } catch (cleanupError) {
        console.error('Failed to clean up emergency data after error:', cleanupError);
      }
      return null;
    }
  }

  // Additional utility methods
  public async forceSave(): Promise<void> {
    return this.saveStats();
  }

  public setOnlineStatus(isOnline: boolean): void {
    this.isOnline = isOnline;
  }

  public setPendingAttempts(attempts: ProblemAttempt[]): void {
    if (this.isDestroyed) {
      console.warn('Cannot set pending attempts on destroyed ProblemAnalyticsManager');
      return;
    }
    
    this.pendingAttempts = [...attempts];
    console.log(`Set ${attempts.length} pending problem attempts for recovery`);
  }

  public setNeedsDailyResetSave(needs: boolean): void {
    this.needsDailyResetSave = needs;
  }

  public async prepareForSignOut(): Promise<void> {
    if (this.hasUnsavedChanges()) {
      console.log('Saving problem stats before sign out...');
      try {
        await this.saveStats();
        console.log('Problem stats saved successfully before sign out');
      } catch (error) {
        console.warn('Failed to save problem stats before sign out, using emergency save');
        this.emergencyLocalSave();
      }
    }
  }

  public static clearEmergencyData(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('emergency_problem_stats_')) {
          localStorage.removeItem(key);
        }
      });
      console.log('Cleared all emergency problem stats data');
    } catch (error) {
      console.error('Error clearing emergency problem stats data:', error);
    }
  }

  // Check if two dates are the same day (utility from XP manager)
  public isSameDay(date1: Date, date2: Date): boolean {
    const day1 = this.getStartOfDay(date1);
    const day2 = this.getStartOfDay(date2);
    return day1.getTime() === day2.getTime();
  }

  public destroy(): void {
    this.isDestroyed = true;
    
    if (this.hasUnsavedChanges()) {
      console.log('Emergency saving problem stats before destruction...');
      this.emergencyLocalSave();
    }
    
    console.log('Problem Analytics Manager destroyed');
  }

  // Utility methods
  public getCurrentStats(): ProblemStats {
    return { ...this.currentStats };
  }

  public getPendingAttempts(): ProblemAttempt[] {
    return [...this.pendingAttempts];
  }

  public getPendingCount(): number {
    return this.pendingAttempts.length;
  }

  public hasUnsavedChanges(): boolean {
    return this.pendingAttempts.length > 0 || this.needsDailyResetSave;
  }

  // Reset daily progress flag for new sessions (key method from XP manager)
  public resetDailyProcessedFlag(): void {
    this.dailyResetProcessed = false;
  }

  public getTotalProblemsSolved(): number {
    return this.currentStats.total_problems_solved;
  }
  
  public getDailyProblemsSolved(): number {
    return this.currentStats.daily_problems_solved;
  }
}
