// client/src/hooks/useProblemXPIntegration.ts
import { useCallback } from 'react';
import { useProblemAnalytics } from './contexts/ProblemContext';
import { useXP } from './contexts/XPContext';
import { ProblemAttempt } from '../components/ProblemManager';

interface ProblemXPResult {
  xpAwarded: number;
  xpMessage: string;
  leveledUp: boolean;
  newLevel?: number;
}

export const useProblemXPIntegration = () => {
  const { recordProblemAttempt, problemStats } = useProblemAnalytics();
  const { awardXP, awardRawXP, xpProgress } = useXP();

  const calculateProblemXP = useCallback((
    difficulty: number,
    isCorrect: boolean,
    timeSpent: number,
    isFirstTry: boolean = false
  ): { baseXP: number; bonuses: Array<{type: string, amount: number, message: string}> } => {
    let baseXP = 0;
    const bonuses: Array<{type: string, amount: number, message: string}> = [];

    if (!isCorrect) {
      return { baseXP: 0, bonuses: [] };
    }

    // Base XP calculation based on difficulty
    if (difficulty <= 2.0) {
      baseXP = 10; // Easy
    } else if (difficulty <= 4.0) {
      baseXP = 20; // Medium
    } else {
      baseXP = 35; // Hard
    }

    // First try bonus
    if (isFirstTry) {
      bonuses.push({
        type: 'FIRST_TRY_CORRECT',
        amount: 5,
        message: 'First try bonus!'
      });
    }

    // Speed bonus (if solved quickly)
    const expectedTime = difficulty * 60; // Rough estimate: difficulty * 60 seconds
    if (timeSpent < expectedTime * 0.5) { // Solved in less than half expected time
      bonuses.push({
        type: 'SPEED_BONUS',
        amount: 15,
        message: 'Speed completion bonus!'
      });
    }

    return { baseXP, bonuses };
  }, []);

  const checkTopicMastery = useCallback((topic: string): boolean => {
    if (!problemStats?.problems_by_topic[topic]) return false;
    
    const topicStats = problemStats.problems_by_topic[topic];
    // Consider mastery as 20+ problems solved with 90%+ accuracy
    return topicStats.solved >= 20 && topicStats.accuracy >= 90;
  }, [problemStats]);

  const checkPerfectScore = useCallback((topic: string, recentAttempts: number = 5): boolean => {
    if (!problemStats?.problems_by_topic[topic]) return false;
    
    const topicStats = problemStats.problems_by_topic[topic];
    // Check if last few attempts were all correct (simplified check)
    return topicStats.accuracy === 100 && topicStats.solved >= recentAttempts;
  }, [problemStats]);

  const handleProblemCompletion = useCallback(async (
    problemId: string,
    topic: string,
    difficulty: number,
    source: string,
    isCorrect: boolean,
    timeSpent: number,
    answerGiven: string,
    isFirstTry: boolean = false
  ): Promise<ProblemXPResult> => {
    const result: ProblemXPResult = {
      xpAwarded: 0,
      xpMessage: '',
      leveledUp: false
    };

    try {
      // Calculate XP
      const { baseXP, bonuses } = calculateProblemXP(difficulty, isCorrect, timeSpent, isFirstTry);
      let totalXP = baseXP;
      let messages: string[] = [];

      // Award base XP if correct
      if (isCorrect && baseXP > 0) {
        const xpResult = awardRawXP(baseXP, `Problem solved (+${baseXP} XP)`, 'problem_solved');
        if (xpResult?.leveledUp) {
          result.leveledUp = true;
          result.newLevel = xpResult.newLevel;
        }
        messages.push(`+${baseXP} XP`);
      }

      // Award bonuses
      for (const bonus of bonuses) {
        const bonusResult = awardXP(bonus.type, bonus.amount, bonus.message);
        if (bonusResult?.leveledUp) {
          result.leveledUp = true;
          result.newLevel = bonusResult.newLevel;
        }
        totalXP += bonus.amount;
        messages.push(`+${bonus.amount} XP (${bonus.message})`);
      }

      // Check for topic mastery (before recording the attempt)
      const wasTopicMastered = checkTopicMastery(topic);

      // Record the problem attempt with XP earned
      const attempt: ProblemAttempt = {
        problemId,
        topic,
        difficulty,
        source,
        isCorrect,
        timeSpent,
        answerGiven,
        xpEarned: totalXP,
        attemptedAt: new Date()
      };

      recordProblemAttempt(attempt);

      // Check for topic mastery after recording (in case this attempt pushes them over)
      if (!wasTopicMastered && checkTopicMastery(topic)) {
        const masteryResult = awardXP('TOPIC_MASTERY');
        if (masteryResult?.leveledUp) {
          result.leveledUp = true;
          result.newLevel = masteryResult.newLevel;
        }
        totalXP += 100;
        messages.push('+100 XP (Topic Mastered!)');
      }

      // Check for perfect score bonus
      if (isCorrect && checkPerfectScore(topic)) {
        const perfectResult = awardXP('PERFECT_SCORE');
        if (perfectResult?.leveledUp) {
          result.leveledUp = true;
          result.newLevel = perfectResult.newLevel;
        }
        totalXP += 50;
        messages.push('+50 XP (Perfect Score!)');
      }

      result.xpAwarded = totalXP;
      result.xpMessage = messages.join(' | ');

      console.log(`Problem completion processed: ${totalXP} XP awarded for ${topic} problem`);
      
      return result;

    } catch (error) {
      console.error('Error handling problem completion:', error);
      
      // Still record the attempt even if XP fails
      const attempt: ProblemAttempt = {
        problemId,
        topic,
        difficulty,
        source,
        isCorrect,
        timeSpent,
        answerGiven,
        xpEarned: 0,
        attemptedAt: new Date()
      };
      
      recordProblemAttempt(attempt);
      
      return result;
    }
  }, [
    calculateProblemXP,
    checkTopicMastery,
    checkPerfectScore,
    recordProblemAttempt,
    awardXP,
    awardRawXP
  ]);

  return {
    handleProblemCompletion,
    calculateProblemXP,
    checkTopicMastery,
    checkPerfectScore,
    // Pass through individual context methods for flexibility
    recordProblemAttempt,
    awardXP,
    awardRawXP,
    problemStats,
    xpProgress
  };
};