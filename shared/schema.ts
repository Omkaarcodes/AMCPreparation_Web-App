// schema.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  char,
  decimal,
  date,
  uniqueIndex,
  index,
  primaryKey
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// ========== CORE TABLES ==========

export const problems = pgTable('problems', {
  id: uuid('id').primaryKey().defaultRandom(),
  problemNumber: integer('problem_number').notNull(),
  year: integer('year').notNull(),
  competition: varchar('competition', { length: 10 }).notNull(),
  topic: varchar('topic', { length: 50 }).notNull(),
  subtopic: varchar('subtopic', { length: 100 }),
  difficulty: integer('difficulty').notNull(),
  problemText: text('problem_text').notNull(),
  answerChoices: jsonb('answer_choices').notNull(),
  correctAnswer: char('correct_answer', { length: 1 }).notNull(),
  explanation: text('explanation'),
  solutionSteps: jsonb('solution_steps'),
  tags: text('tags').array(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_problems_topic').on(table.topic),
  index('idx_problems_difficulty').on(table.difficulty),
  index('idx_problems_competition').on(table.competition),
  index('idx_problems_year').on(table.year),
]);

export const userProfiles = pgTable('user_profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  firebaseUid: varchar('firebase_uid', { length: 128 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  displayName: varchar('display_name', { length: 100 }),
  gradeLevel: integer('grade_level'),
  targetCompetition: varchar('target_competition', { length: 10 }),
  totalXp: integer('total_xp').default(0),
  currentStreak: integer('current_streak').default(0),
  longestStreak: integer('longest_streak').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_user_profiles_firebase_uid').on(table.firebaseUid),
]);

export const userProblemAttempts = pgTable('user_problem_attempts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  problemId: uuid('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
  selectedAnswer: char('selected_answer', { length: 1 }),
  isCorrect: boolean('is_correct').notNull(),
  timeSpent: integer('time_spent').notNull(),
  attemptNumber: integer('attempt_number').default(1),
  sessionType: varchar('session_type', { length: 20 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  index('idx_attempts_user_id').on(table.userId),
  index('idx_attempts_problem_id').on(table.problemId),
  index('idx_attempts_user_created').on(table.userId, table.createdAt),
]);

export const userTopicMastery = pgTable('user_topic_mastery', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  topic: varchar('topic', { length: 50 }).notNull(),
  masteryLevel: decimal('mastery_level', { precision: 3, scale: 2 }).default('0.0'),
  problemsAttempted: integer('problems_attempted').default(0),
  problemsCorrect: integer('problems_correct').default(0),
  lastPracticed: timestamp('last_practiced', { withTimezone: true }),
  nextReview: timestamp('next_review', { withTimezone: true }),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('user_topic_unique').on(table.userId, table.topic),
]);

export const practiceSessions = pgTable('practice_sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  sessionType: varchar('session_type', { length: 20 }).notNull(),
  topic: varchar('topic', { length: 50 }),
  difficultyLevel: integer('difficulty_level'),
  problemsAttempted: integer('problems_attempted').default(0),
  problemsCorrect: integer('problems_correct').default(0),
  totalTime: integer('total_time').default(0),
  xpEarned: integer('xp_earned').default(0),
  completed: boolean('completed').default(false),
  startedAt: timestamp('started_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// ========== GAMIFICATION TABLES ==========

export const achievements = pgTable('achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description').notNull(),
  icon: varchar('icon', { length: 50 }),
  xpReward: integer('xp_reward').default(0),
  requirementType: varchar('requirement_type', { length: 20 }).notNull(),
  requirementValue: integer('requirement_value').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const userAchievements = pgTable('user_achievements', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  achievementId: uuid('achievement_id').notNull().references(() => achievements.id, { onDelete: 'cascade' }),
  earnedAt: timestamp('earned_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('user_achievement_unique').on(table.userId, table.achievementId),
]);

export const dailyStreaks = pgTable('daily_streaks', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  problemsSolved: integer('problems_solved').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('user_date_unique').on(table.userId, table.date),
]);

// ========== ADVANCED FEATURES TABLES ==========

export const spacedRepetitionQueue = pgTable('spaced_repetition_queue', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  problemId: uuid('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
  repetitionLevel: integer('repetition_level').default(1),
  easeFactor: decimal('ease_factor', { precision: 3, scale: 2 }).default('2.5'),
  intervalDays: integer('interval_days').default(1),
  nextReviewDate: date('next_review_date').notNull(),
  lastReviewed: timestamp('last_reviewed', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('user_problem_unique').on(table.userId, table.problemId),
]);

export const errorJournal = pgTable('error_journal', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  problemId: uuid('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
  mistakeType: varchar('mistake_type', { length: 50 }),
  userNotes: text('user_notes'),
  timesAttempted: integer('times_attempted').default(1),
  timesCorrect: integer('times_correct').default(0),
  isResolved: boolean('is_resolved').default(false),
  firstMistake: timestamp('first_mistake', { withTimezone: true }).defaultNow(),
  lastAttempt: timestamp('last_attempt', { withTimezone: true }).defaultNow(),
});

export const customPlaylists = pgTable('custom_playlists', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => userProfiles.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isPublic: boolean('is_public').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const playlistProblems = pgTable('playlist_problems', {
  playlistId: uuid('playlist_id').notNull().references(() => customPlaylists.id, { onDelete: 'cascade' }),
  problemId: uuid('problem_id').notNull().references(() => problems.id, { onDelete: 'cascade' }),
  orderIndex: integer('order_index').notNull(),
  addedAt: timestamp('added_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  primaryKey({ columns: [table.playlistId, table.problemId] }),
]);

export const challenges = pgTable('challenges', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  topic: varchar('topic', { length: 50 }),
  difficultyLevel: integer('difficulty_level'),
  startDate: timestamp('start_date', { withTimezone: true }).notNull(),
  endDate: timestamp('end_date', { withTimezone: true }).notNull(),
  maxProblems: integer('max_problems').default(10),
  xpReward: integer('xp_reward').default(100),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

// ========== RELATIONS ==========

export const problemsRelations = relations(problems, ({ many }) => ({
  attempts: many(userProblemAttempts),
  spacedRepetitionQueue: many(spacedRepetitionQueue),
  errorJournal: many(errorJournal),
  playlistProblems: many(playlistProblems),
}));

export const userProfilesRelations = relations(userProfiles, ({ many }) => ({
  attempts: many(userProblemAttempts),
  topicMastery: many(userTopicMastery),
  practiceSessions: many(practiceSessions),
  achievements: many(userAchievements),
  dailyStreaks: many(dailyStreaks),
  spacedRepetitionQueue: many(spacedRepetitionQueue),
  errorJournal: many(errorJournal),
  customPlaylists: many(customPlaylists),
}));

export const userProblemAttemptsRelations = relations(userProblemAttempts, ({ one }) => ({
  user: one(userProfiles, {
    fields: [userProblemAttempts.userId],
    references: [userProfiles.id],
  }),
  problem: one(problems, {
    fields: [userProblemAttempts.problemId],
    references: [problems.id],
  }),
}));

export const userTopicMasteryRelations = relations(userTopicMastery, ({ one }) => ({
  user: one(userProfiles, {
    fields: [userTopicMastery.userId],
    references: [userProfiles.id],
  }),
}));

export const practiceSessionsRelations = relations(practiceSessions, ({ one }) => ({
  user: one(userProfiles, {
    fields: [practiceSessions.userId],
    references: [userProfiles.id],
  }),
}));

export const userAchievementsRelations = relations(userAchievements, ({ one }) => ({
  user: one(userProfiles, {
    fields: [userAchievements.userId],
    references: [userProfiles.id],
  }),
  achievement: one(achievements, {
    fields: [userAchievements.achievementId],
    references: [achievements.id],
  }),
}));

export const achievementsRelations = relations(achievements, ({ many }) => ({
  userAchievements: many(userAchievements),
}));

export const dailyStreaksRelations = relations(dailyStreaks, ({ one }) => ({
  user: one(userProfiles, {
    fields: [dailyStreaks.userId],
    references: [userProfiles.id],
  }),
}));

export const spacedRepetitionQueueRelations = relations(spacedRepetitionQueue, ({ one }) => ({
  user: one(userProfiles, {
    fields: [spacedRepetitionQueue.userId],
    references: [userProfiles.id],
  }),
  problem: one(problems, {
    fields: [spacedRepetitionQueue.problemId],
    references: [problems.id],
  }),
}));

export const errorJournalRelations = relations(errorJournal, ({ one }) => ({
  user: one(userProfiles, {
    fields: [errorJournal.userId],
    references: [userProfiles.id],
  }),
  problem: one(problems, {
    fields: [errorJournal.problemId],
    references: [problems.id],
  }),
}));

export const customPlaylistsRelations = relations(customPlaylists, ({ one, many }) => ({
  user: one(userProfiles, {
    fields: [customPlaylists.userId],
    references: [userProfiles.id],
  }),
  playlistProblems: many(playlistProblems),
}));

export const playlistProblemsRelations = relations(playlistProblems, ({ one }) => ({
  playlist: one(customPlaylists, {
    fields: [playlistProblems.playlistId],
    references: [customPlaylists.id],
  }),
  problem: one(problems, {
    fields: [playlistProblems.problemId],
    references: [problems.id],
  }),
}));

// ========== ZOD SCHEMAS ==========

// Insert schemas (for creating new records)
export const insertProblemSchema = createInsertSchema(problems);
export const insertUserProfileSchema = createInsertSchema(userProfiles);
export const insertUserProblemAttemptSchema = createInsertSchema(userProblemAttempts);
export const insertUserTopicMasterySchema = createInsertSchema(userTopicMastery);
export const insertPracticeSessionSchema = createInsertSchema(practiceSessions);
export const insertAchievementSchema = createInsertSchema(achievements);
export const insertUserAchievementSchema = createInsertSchema(userAchievements);
export const insertDailyStreakSchema = createInsertSchema(dailyStreaks);
export const insertSpacedRepetitionQueueSchema = createInsertSchema(spacedRepetitionQueue);
export const insertErrorJournalSchema = createInsertSchema(errorJournal);
export const insertCustomPlaylistSchema = createInsertSchema(customPlaylists);
export const insertPlaylistProblemSchema = createInsertSchema(playlistProblems);
export const insertChallengeSchema = createInsertSchema(challenges);

// Select schemas (for reading records)
export const selectProblemSchema = createSelectSchema(problems);
export const selectUserProfileSchema = createSelectSchema(userProfiles);
export const selectUserProblemAttemptSchema = createSelectSchema(userProblemAttempts);
export const selectUserTopicMasterySchema = createSelectSchema(userTopicMastery);
export const selectPracticeSessionSchema = createSelectSchema(practiceSessions);
export const selectAchievementSchema = createSelectSchema(achievements);
export const selectUserAchievementSchema = createSelectSchema(userAchievements);
export const selectDailyStreakSchema = createSelectSchema(dailyStreaks);
export const selectSpacedRepetitionQueueSchema = createSelectSchema(spacedRepetitionQueue);
export const selectErrorJournalSchema = createSelectSchema(errorJournal);
export const selectCustomPlaylistSchema = createSelectSchema(customPlaylists);
export const selectPlaylistProblemSchema = createSelectSchema(playlistProblems);
export const selectChallengeSchema = createSelectSchema(challenges);

// ========== TYPESCRIPT TYPES ==========

export type Problem = typeof problems.$inferSelect;
export type NewProblem = typeof problems.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;

export type UserProblemAttempt = typeof userProblemAttempts.$inferSelect;
export type NewUserProblemAttempt = typeof userProblemAttempts.$inferInsert;

export type UserTopicMastery = typeof userTopicMastery.$inferSelect;
export type NewUserTopicMastery = typeof userTopicMastery.$inferInsert;

export type PracticeSession = typeof practiceSessions.$inferSelect;
export type NewPracticeSession = typeof practiceSessions.$inferInsert;

export type Achievement = typeof achievements.$inferSelect;
export type NewAchievement = typeof achievements.$inferInsert;

export type UserAchievement = typeof userAchievements.$inferSelect;
export type NewUserAchievement = typeof userAchievements.$inferInsert;

export type DailyStreak = typeof dailyStreaks.$inferSelect;
export type NewDailyStreak = typeof dailyStreaks.$inferInsert;

export type SpacedRepetitionQueue = typeof spacedRepetitionQueue.$inferSelect;
export type NewSpacedRepetitionQueue = typeof spacedRepetitionQueue.$inferInsert;

export type ErrorJournal = typeof errorJournal.$inferSelect;
export type NewErrorJournal = typeof errorJournal.$inferInsert;

export type CustomPlaylist = typeof customPlaylists.$inferSelect;
export type NewCustomPlaylist = typeof customPlaylists.$inferInsert;

export type PlaylistProblem = typeof playlistProblems.$inferSelect;
export type NewPlaylistProblem = typeof playlistProblems.$inferInsert;

export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;