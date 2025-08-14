export interface QuizResult {
  score: number;
  maxScore: number;
  timeSpentSeconds: number;
  timeLimitSeconds: number;
  difficulty: 'amc8' | 'amc10' | 'amc12' | 'aime';
  quizType: 'practice' | 'mock_contest' | 'problem_set';
  isFirstPerfectScore?: boolean;
  isPersonalBest?: boolean;
  improvementFromLast?: number;
}

export interface UserStats {
  currentStreak: number;
  quizzesToday: number;
  topicsPracticedToday: number;
  dailyXpEarned: number;
  isWeekend: boolean;
  hasReviewedSolutions: boolean;
  hasAnalyzedMistakes: boolean;
  hasStudiedConcepts: boolean;
}

export interface XPCalculationResult {
  baseXP: number;
  multiplier: number;
  bonuses: Array<{ name: string; xp: number; reason: string }>;
  totalXP: number;
  breakdown: string[];
}

// constants/xpRules.ts
export const XP_RULES = {
  // Quiz performance base XP
  quiz_performance: {
    perfect: 50,      // 100%
    excellent: 40,    // 90-99%
    good: 30,         // 80-89%
    fair: 20,         // 70-79%
    passing: 10,      // 60-69%
    participation: 5  // <60%
  },

  // Difficulty multipliers
  difficulty_multipliers: {
    amc8: 1.0,
    amc10: 1.5,
    amc12: 2.0,
    aime: 3.0
  },

  // Time-based bonuses
  time_bonuses: {
    lightning_fast: { threshold: 0.5, xp: 20, name: "Lightning Fast" },
    very_quick: { threshold: 0.7, xp: 15, name: "Very Quick" },
    quick: { threshold: 0.85, xp: 10, name: "Quick Completion" }
  },

  // Daily activity bonuses with caps
  daily_bonuses: {
    practice_streak: { xp_per_day: 5, weekly_cap: 35, name: "Daily Practice Streak" },
    first_quiz: { xp: 10, daily_cap: 10, name: "First Quiz of Day" },
    weekend_practice: { xp: 10, daily_cap: 20, name: "Weekend Warrior" }
  },

  // Special streak milestones
  streak_bonuses: {
    short_streak: { min_days: 3, xp: 15, name: "Practice Streak" },
    perfect_week: { min_days: 7, xp: 50, name: "Perfect Week" },
    dedication_master: { min_days: 30, xp: 200, name: "Dedication Master" }
  },

  // Achievement bonuses
  achievement_bonuses: {
    first_perfect: { xp: 25, name: "First Perfect Score" },
    personal_best: { xp: 25, name: "Personal Best" },
    comeback_victory: { xp: 30, min_improvement: 20, name: "Comeback Victory" },
    topic_mastery: { xp: 100, name: "Topic Mastery" },
    hard_problem_solved: { xp: 35, min_difficulty: 4, name: "Hard Problem Conquered" },
    contest_simulation: { xp: 75, name: "Contest Simulation Complete" }
  },

  // Study activity bonuses with daily caps
  study_bonuses: {
    solution_review: { xp: 15, daily_cap: 15, name: "Solution Review" },
    mistake_analysis: { xp: 20, daily_cap: 20, name: "Mistake Analysis" },
    concept_study: { xp: 10, daily_cap: 30, name: "Concept Study" }
  },

  // Marathon and exploration bonuses
  exploration_bonuses: {
    quiz_marathon: { min_quizzes: 5, xp: 30, daily_cap: 30, name: "Quiz Marathon" },
    knowledge_explorer: { min_topics: 3, xp: 20, daily_cap: 20, name: "Knowledge Explorer" }
  },

  // Social learning bonuses
  social_bonuses: {
    help_others: { xp: 40, daily_cap: 80, name: "Helping Others" },
    good_question: { xp: 15, daily_cap: 30, name: "Good Question Asked" }
  }
};

// services/xpService.ts
export class XPService {
  /**
   * Calculate total XP for a quiz result
   */
  calculateQuizXP(result: QuizResult, userStats: UserStats): XPCalculationResult {
    const breakdown: string[] = [];
    const bonuses: Array<{ name: string; xp: number; reason: string }> = [];

    // 1. Base XP from quiz performance
    const scorePercentage = (result.score / result.maxScore) * 100;
    const baseXP = this.getBaseXP(scorePercentage);
    breakdown.push(`Base XP: ${baseXP} (${scorePercentage.toFixed(1)}% score)`);

    // 2. Apply difficulty multiplier
    const multiplier = XP_RULES.difficulty_multipliers[result.difficulty];
    const multipliedXP = Math.floor(baseXP * multiplier);
    if (multiplier !== 1.0) {
      breakdown.push(`Difficulty multiplier: ${multiplier}x (${result.difficulty.toUpperCase()})`);
    }

    // 3. Time bonuses
    const timeRatio = result.timeSpentSeconds / result.timeLimitSeconds;
    const timeBonus = this.calculateTimeBonus(timeRatio);
    if (timeBonus.xp > 0) {
      bonuses.push({ name: timeBonus.name, xp: timeBonus.xp, reason: `Completed in ${Math.round(timeRatio * 100)}% of time limit` });
    }

    // 4. Achievement bonuses
    const achievementBonuses = this.calculateAchievementBonuses(result);
    bonuses.push(...achievementBonuses);

    // 5. Daily and streak bonuses
    const dailyBonuses = this.calculateDailyBonuses(userStats);
    bonuses.push(...dailyBonuses);

    // 6. Study activity bonuses
    const studyBonuses = this.calculateStudyBonuses(userStats);
    bonuses.push(...studyBonuses);

    // Calculate total
    const totalBonusXP = bonuses.reduce((sum, bonus) => sum + bonus.xp, 0);
    const totalXP = multipliedXP + totalBonusXP;

    breakdown.push(`Total bonuses: ${totalBonusXP} XP`);
    breakdown.push(`Final total: ${totalXP} XP`);

    return {
      baseXP: multipliedXP,
      multiplier,
      bonuses,
      totalXP,
      breakdown
    };
  }

  /**
   * Get base XP based on score percentage
   */
  private getBaseXP(percentage: number): number {
    if (percentage === 100) return XP_RULES.quiz_performance.perfect;
    if (percentage >= 90) return XP_RULES.quiz_performance.excellent;
    if (percentage >= 80) return XP_RULES.quiz_performance.good;
    if (percentage >= 70) return XP_RULES.quiz_performance.fair;
    if (percentage >= 60) return XP_RULES.quiz_performance.passing;
    return XP_RULES.quiz_performance.participation;
  }

  /**
   * Calculate time-based bonus XP
   */
  private calculateTimeBonus(timeRatio: number): { xp: number; name: string } {
    const { time_bonuses } = XP_RULES;
    
    if (timeRatio <= time_bonuses.lightning_fast.threshold) {
      return { xp: time_bonuses.lightning_fast.xp, name: time_bonuses.lightning_fast.name };
    }
    if (timeRatio <= time_bonuses.very_quick.threshold) {
      return { xp: time_bonuses.very_quick.xp, name: time_bonuses.very_quick.name };
    }
    if (timeRatio <= time_bonuses.quick.threshold) {
      return { xp: time_bonuses.quick.xp, name: time_bonuses.quick.name };
    }
    
    return { xp: 0, name: "" };
  }

  /**
   * Calculate achievement-based bonuses
   */
  private calculateAchievementBonuses(result: QuizResult): Array<{ name: string; xp: number; reason: string }> {
    const bonuses: Array<{ name: string; xp: number; reason: string }> = [];
    const { achievement_bonuses } = XP_RULES;

    // First perfect score
    if (result.isFirstPerfectScore && result.score === result.maxScore) {
      bonuses.push({
        name: achievement_bonuses.first_perfect.name,
        xp: achievement_bonuses.first_perfect.xp,
        reason: "Your very first perfect score!"
      });
    }

    // Personal best
    if (result.isPersonalBest) {
      bonuses.push({
        name: achievement_bonuses.personal_best.name,
        xp: achievement_bonuses.personal_best.xp,
        reason: "New personal high score!"
      });
    }

    // Comeback victory (significant improvement)
    if (result.improvementFromLast && result.improvementFromLast >= achievement_bonuses.comeback_victory.min_improvement) {
      bonuses.push({
        name: achievement_bonuses.comeback_victory.name,
        xp: achievement_bonuses.comeback_victory.xp,
        reason: `Improved by ${result.improvementFromLast} points!`
      });
    }

    // Contest simulation bonus
    if (result.quizType === 'mock_contest') {
      bonuses.push({
        name: achievement_bonuses.contest_simulation.name,
        xp: achievement_bonuses.contest_simulation.xp,
        reason: "Completed full mock contest"
      });
    }

    return bonuses;
  }

  /**
   * Calculate daily activity and streak bonuses
   */
  private calculateDailyBonuses(stats: UserStats): Array<{ name: string; xp: number; reason: string }> {
    const bonuses: Array<{ name: string; xp: number; reason: string }> = [];
    const { daily_bonuses, streak_bonuses, exploration_bonuses } = XP_RULES;

    // First quiz of the day
    if (stats.quizzesToday === 1) {
      bonuses.push({
        name: daily_bonuses.first_quiz.name,
        xp: daily_bonuses.first_quiz.xp,
        reason: "First quiz completed today"
      });
    }

    // Weekend practice bonus
    if (stats.isWeekend) {
      bonuses.push({
        name: daily_bonuses.weekend_practice.name,
        xp: daily_bonuses.weekend_practice.xp,
        reason: "Practicing on the weekend"
      });
    }

    // Streak bonuses (only award the highest applicable)
    if (stats.currentStreak >= streak_bonuses.dedication_master.min_days) {
      bonuses.push({
        name: streak_bonuses.dedication_master.name,
        xp: streak_bonuses.dedication_master.xp,
        reason: `${stats.currentStreak} day practice streak!`
      });
    } else if (stats.currentStreak >= streak_bonuses.perfect_week.min_days) {
      bonuses.push({
        name: streak_bonuses.perfect_week.name,
        xp: streak_bonuses.perfect_week.xp,
        reason: `${stats.currentStreak} day practice streak!`
      });
    } else if (stats.currentStreak >= streak_bonuses.short_streak.min_days) {
      bonuses.push({
        name: streak_bonuses.short_streak.name,
        xp: streak_bonuses.short_streak.xp,
        reason: `${stats.currentStreak} day practice streak!`
      });
    }

    // Quiz marathon
    if (stats.quizzesToday >= exploration_bonuses.quiz_marathon.min_quizzes) {
      bonuses.push({
        name: exploration_bonuses.quiz_marathon.name,
        xp: exploration_bonuses.quiz_marathon.xp,
        reason: `Completed ${stats.quizzesToday} quizzes today`
      });
    }

    // Knowledge explorer
    if (stats.topicsPracticedToday >= exploration_bonuses.knowledge_explorer.min_topics) {
      bonuses.push({
        name: exploration_bonuses.knowledge_explorer.name,
        xp: exploration_bonuses.knowledge_explorer.xp,
        reason: `Practiced ${stats.topicsPracticedToday} different topics today`
      });
    }

    return bonuses;
  }

  /**
   * Calculate study activity bonuses
   */
  private calculateStudyBonuses(stats: UserStats): Array<{ name: string; xp: number; reason: string }> {
    const bonuses: Array<{ name: string; xp: number; reason: string }> = [];
    const { study_bonuses } = XP_RULES;

    // Solution review (only if not already earned today)
    if (stats.hasReviewedSolutions) {
      bonuses.push({
        name: study_bonuses.solution_review.name,
        xp: study_bonuses.solution_review.xp,
        reason: "Reviewed quiz solutions and explanations"
      });
    }

    // Mistake analysis
    if (stats.hasAnalyzedMistakes) {
      bonuses.push({
        name: study_bonuses.mistake_analysis.name,
        xp: study_bonuses.mistake_analysis.xp,
        reason: "Analyzed incorrect answers"
      });
    }

    // Concept study
    if (stats.hasStudiedConcepts) {
      bonuses.push({
        name: study_bonuses.concept_study.name,
        xp: study_bonuses.concept_study.xp,
        reason: "Studied mathematical concepts"
      });
    }

    return bonuses;
  }

  /**
   * Get all available XP rules for display in UI
   */
  getXPRulesForDisplay() {
    return {
      quiz_performance: XP_RULES.quiz_performance,
      difficulty_multipliers: XP_RULES.difficulty_multipliers,
      time_bonuses: Object.values(XP_RULES.time_bonuses),
      daily_bonuses: Object.values(XP_RULES.daily_bonuses),
      streak_bonuses: Object.values(XP_RULES.streak_bonuses),
      achievement_bonuses: Object.values(XP_RULES.achievement_bonuses),
      study_bonuses: Object.values(XP_RULES.study_bonuses)
    };
  }

  /**
   * Calculate daily streak XP (separate from quiz XP)
   */
  calculateDailyStreakXP(currentStreak: number, dailyXpEarned: number): number {
    const { daily_bonuses } = XP_RULES;
    const streakXp = daily_bonuses.practice_streak.xp_per_day;
    const weeklyCap = daily_bonuses.practice_streak.weekly_cap;
    
    // Simple implementation - in real app, you'd track weekly totals
    return Math.min(streakXp, Math.max(0, weeklyCap - dailyXpEarned));
  }
}

// Example usage:
/*
const xpService = new XPService();

const quizResult: QuizResult = {
  score: 18,
  maxScore: 20,
  timeSpentSeconds: 900, // 15 minutes
  timeLimitSeconds: 1200, // 20 minutes
  difficulty: 'amc10',
  quizType: 'practice',
  isPersonalBest: true
};

const userStats: UserStats = {
  currentStreak: 5,
  quizzesToday: 2,
  topicsPracticedToday: 2,
  dailyXpEarned: 45,
  isWeekend: true,
  hasReviewedSolutions: true,
  hasAnalyzedMistakes: false,
  hasStudiedConcepts: false
};

const xpResult = xpService.calculateQuizXP(quizResult, userStats);
console.log(`Total XP earned: ${xpResult.totalXP}`);
console.log('Breakdown:', xpResult.breakdown);
console.log('Bonuses:', xpResult.bonuses);
*/