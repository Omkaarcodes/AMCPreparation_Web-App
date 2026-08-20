import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Target, Filter, Play, ChevronDown, Loader2, Check, XCircle, Clock, Lightbulb, Trophy, RotateCcw, ArrowRight, Zap, TrendingUp, Bookmark, BookmarkCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { supabase } from '../supabase-client';
import { XPProgressManager } from '../../components/XPBonuses'; 
import { useLevelUpNotification, LevelUpNotification } from '../../components/notifications/LevelUp';
import { ProblemAnalyticsManager, ProblemAttempt } from '../../components/ProblemManager'



import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import { useXP } from '../../hooks/contexts/XPContext';

interface Problem {
    unique_problem_id: string;
    problem: string;
    solution: string;
    answer: string;
    source: string;
    difficulty: string;
    question_type: string;
    topic: string;
    year: string;
    problem_number: string;
    dataset_origin: string;
    difficulty_1: string;
}

interface ProblemFilters {
    topic?: string;
    difficulty: number; // 1-10 scale
    problemCount: number;
}

interface ProblemsSolvedWidgetProps {
    isOpen: boolean;
    onClose: () => void;
    onStartPractice: (problems: Problem[]) => void;
    xpManager: XPProgressManager; 
    problemAnalyticsManager: ProblemAnalyticsManager;
    user?: any;
}

interface ProblemState {
    userAnswer: string;
    isSubmitted: boolean;
    isCorrect: boolean | null;
    showSolution: boolean;
    timeSpent: number;
    showHint: boolean;
    xpGained: number;
    isBookmarked: boolean;
}

interface SessionStats {
    totalQuestions: number;
    correctAnswers: number;
    totalTimeSpent: number;
    averageTimePerQuestion: number;
    accuracy: number;
    totalXP: number;
    difficultyBreakdown: Record<string, { correct: number; total: number }>;
    topicBreakdown: Record<string, { correct: number; total: number }>;
    bookmarkedProblems: string[];
}

const MathRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = "" }) => {
    const renderMathContent = (text: string) => {
        if (!text) return null;
        const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]*?\$)/g;
        
        const parts = text.split(mathRegex);
        
        return parts.map((part, index) => {
            // Handle different LaTeX delimiters
            if (part.startsWith('$$') && part.endsWith('$$')) {
                // Block math with $$...$$
                const latex = part.slice(2, -2).trim();
                try {
                    return <BlockMath key={index} math={latex} />;
                } catch (error) {
                    console.error('LaTeX parsing error ($$):', error, 'LaTeX:', latex);
                    return <span key={index} className="text-red-400 bg-red-900/20 px-2 py-1 rounded">LaTeX Error: {part}</span>;
                }
            } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                // Block math with \[...\]
                const latex = part.slice(2, -2).trim();
                try {
                    return <BlockMath key={index} math={latex} />;
                } catch (error) {
                    console.error('LaTeX parsing error (\\[\\]):', error, 'LaTeX:', latex);
                    return <span key={index} className="text-red-400 bg-red-900/20 px-2 py-1 rounded">LaTeX Error: {part}</span>;
                }
            } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                // Inline math with \(...\)
                const latex = part.slice(2, -2).trim();
                try {
                    return <InlineMath key={index} math={latex} />;
                } catch (error) {
                    console.error('LaTeX parsing error (\\(\\)):', error, 'LaTeX:', latex);
                    return <span key={index} className="text-red-400 bg-red-900/20 px-1 rounded">LaTeX Error: {part}</span>;
                }
            } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                // Inline math with $...$
                const latex = part.slice(1, -1).trim();
                try {
                    return <InlineMath key={index} math={latex} />;
                } catch (error) {
                    console.error('LaTeX parsing error ($):', error, 'LaTeX:', latex);
                    return <span key={index} className="text-red-400 bg-red-900/20 px-1 rounded">LaTeX Error: {part}</span>;
                }
            } else {
                // Regular text - preserve whitespace and line breaks
                return part.split('\n').map((line, lineIndex) => (
                    <span key={`${index}-${lineIndex}`}>
                        {line}
                        {lineIndex < part.split('\n').length - 1 && <br />}
                    </span>
                ));
            }
        });
    };

    return (
        <div className={`math-content ${className}`}>
            {renderMathContent(content)}
        </div>
    );
};

export default function ProblemsSolvedWidget({ 
    isOpen, 
    onClose, 
    onStartPractice,
    xpManager,
    problemAnalyticsManager,
    user
}: ProblemsSolvedWidgetProps) {

    const { notification, showLevelUp, hideLevelUp } = useLevelUpNotification();
    const { refreshXPState } = useXP();
    const [sessionXPSaved, setSessionXPSaved] = useState(false);
    const savingInProgressRef = useRef(false);

    const [filters, setFilters] = useState<ProblemFilters>({
        topic: '',
        difficulty: 5, // Default to medium difficulty
        problemCount: 10
    });
    
    const [filterOptions, setFilterOptions] = useState({
        topics: [] as string[],
        difficulties: [] as string[]
    });
    
    const [loading, setLoading] = useState(false);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [showDropdowns, setShowDropdowns] = useState({
        topic: false
    });
    const [problems, setProblems] = useState<Problem[]>([]);
    const [showProblems, setShowProblems] = useState(false);
    const [currentProblemIndex, setCurrentProblemIndex] = useState(0);
    const [sessionStartTime, setSessionStartTime] = useState<number>(0);
    const [problemStartTime, setProblemStartTime] = useState<number>(0);
    const [timeLeft, setTimeLeft] = useState(180); // 3 minutes per problem
    const [isActive, setIsActive] = useState(false);
    const [showReview, setShowReview] = useState(false);
    const [savingBookmarks, setSavingBookmarks] = useState(false);
    
    const [problemStates, setProblemStates] = useState<Record<string, ProblemState>>({});

   

    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (isActive && timeLeft > 0 && !getCurrentProblemState().isSubmitted) {
            interval = setInterval(() => {
                setTimeLeft((time) => time - 1);
            }, 1000);
        } else if (timeLeft === 0 && !getCurrentProblemState().isSubmitted) {
            handleTimeUp();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [isActive, timeLeft, problemStates, currentProblemIndex]);

    // Load available filter options on component mount
    useEffect(() => {
        if (isOpen) {
            loadFilterOptions();
        }
    }, [isOpen]);

    // Initialize problem states when problems are loaded
    useEffect(() => {
        if (problems.length > 0) {
            const initialStates: Record<string, ProblemState> = {};
            problems.forEach(problem => {
                initialStates[problem.unique_problem_id] = {
                    userAnswer: '',
                    isSubmitted: false,
                    isCorrect: null,
                    showSolution: false,
                    timeSpent: 0,
                    showHint: false,
                    xpGained: 0,
                    isBookmarked: false
                };
            });
            setProblemStates(initialStates);
            setCurrentProblemIndex(0);
            setSessionStartTime(Date.now());
            setProblemStartTime(Date.now());
            setTimeLeft(180);
            setIsActive(true);
        }
    }, [problems]);

    useEffect(() => {
    if (isOpen && problemAnalyticsManager && user) {
        // Check and reset daily progress when opening the widget
        const resetOccurred = problemAnalyticsManager.checkAndResetDaily();
        if (resetOccurred) {
            console.log('Daily progress reset detected');
        }
    }
}, [isOpen, problemAnalyticsManager, user]);

    const getCurrentProblem = () => problems[currentProblemIndex];
    const getCurrentProblemState = () => {
        if (!getCurrentProblem()) return {
            userAnswer: '',
            isSubmitted: false,
            isCorrect: null,
            showSolution: false,
            timeSpent: 0,
            showHint: false,
            xpGained: 0,
            isBookmarked: false
        };
        return problemStates[getCurrentProblem().unique_problem_id] || {
            userAnswer: '',
            isSubmitted: false,
            isCorrect: null,
            showSolution: false,
            timeSpent: 0,
            showHint: false,
            xpGained: 0,
            isBookmarked: false
        };
    };
    
    // Bookmark database functions
    const getSupabaseToken = async (): Promise<string> => {
        if (!user) {
            throw new Error('No Firebase user signed in');
        }

        console.log('Getting Firebase ID token...');
        const idToken = await user.getIdToken(true);
        
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
    };

    const saveBookmarksToDatabase = async (bookmarkedProblemIds: string[]): Promise<void> => {
    if (!user || bookmarkedProblemIds.length === 0) {
        console.log('No user or no bookmarks to save');
        return;
    }

    setSavingBookmarks(true);
    try {
        console.log('Saving bookmarks to database...');
        const token = await getSupabaseToken();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        // First, try to get existing bookmarks
        const getResponse = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey,
                'Content-Type': 'application/json'
            }
        });

        let existingBookmarks: string[] = [];
        let hasExistingRecord = false;

        if (getResponse.ok) {
            const existingData = await getResponse.json();
            if (existingData && existingData.length > 0) {
                hasExistingRecord = true;
                const bookmarksText = existingData[0].problems_bookmarked;
                if (bookmarksText) {
                    try {
                        // Handle different bookmark formats
                        if (typeof bookmarksText === 'string') {
                            // If it's a string like "[id1, id2, id3]"
                            const cleanedText = bookmarksText.replace(/[\[\]]/g, '');
                            if (cleanedText.trim()) {
                                existingBookmarks = cleanedText.split(',').map(id => id.trim());
                            }
                        } else if (Array.isArray(bookmarksText)) {
                            // If it's already an array
                            existingBookmarks = bookmarksText;
                        }
                    } catch (parseError) {
                        console.warn('Error parsing existing bookmarks, starting fresh:', parseError);
                        existingBookmarks = [];
                    }
                }
            }
        } else {
            // If the GET request failed, we'll treat it as no existing record
            console.log('No existing bookmarks found or error fetching:', getResponse.status);
        }

        // Merge existing bookmarks with new ones (avoid duplicates)
        const combinedBookmarks = existingBookmarks.concat(bookmarkedProblemIds);
        const allBookmarks = Array.from(new Set(combinedBookmarks));
        const bookmarksText = `[${allBookmarks.join(', ')}]`;

        // Update or create record based on whether it exists
        if (hasExistingRecord) {
            // Update existing record
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    problems_bookmarked: bookmarksText
                })
            });

            if (!updateResponse.ok) {
                const errorText = await updateResponse.text();
                throw new Error(`Bookmark update failed: HTTP ${updateResponse.status}: ${errorText}`);
            }

            console.log('Bookmarks updated successfully');
        } else {
            // Create new record
            const createResponse = await fetch(`${supabaseUrl}/rest/v1/user_problem_data`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify({
                    user_id: user.uid,
                    problems_bookmarked: bookmarksText,
                    total_problems_solved: 0
                })
            });

            if (!createResponse.ok) {
                const errorText = await createResponse.text();
                throw new Error(`Bookmark creation failed: HTTP ${createResponse.status}: ${errorText}`);
            }

            console.log('Bookmarks created successfully');
        }
    } catch (error) {
        console.error('Error saving bookmarks:', error);
        throw error;
    } finally {
        setSavingBookmarks(false);
    }
};

    const loadFilterOptions = async () => {
        setLoadingFilters(true);
        try {
            // Get all distinct topics and difficulties
            const { data, error } = await supabase
                .from('Problems_DataBank')
                .select('topic, difficulty');

            if (error) {
                console.error('Error fetching filter options:', error);
                // Set fallback options
                setFilterOptions({
                    topics: ['Algebra', 'Geometry', 'Number Theory', 'Combinatorics'],
                    difficulties: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
                });
            } else {
                // Extract unique topics and difficulties
                const uniqueTopics = new Set(data?.map(item => item.topic).filter(Boolean));
                const uniqueDifficulties = new Set(data?.map(item => item.difficulty).filter(Boolean));
                
                const topics = Array.from(uniqueTopics).sort();
                const difficulties = Array.from(uniqueDifficulties).sort((a, b) => {
                    // Try to sort numerically if possible, otherwise alphabetically
                    const numA = parseInt(a);
                    const numB = parseInt(b);
                    if (!isNaN(numA) && !isNaN(numB)) {
                        return numA - numB;
                    }
                    return a.localeCompare(b);
                });
                
                setFilterOptions({
                    topics,
                    difficulties
                });
            }
        } catch (error) {
            console.error('Error loading filter options:', error);
            // Set fallback options
            setFilterOptions({
                topics: ['Algebra', 'Geometry', 'Number Theory', 'Combinatorics', 'Probability'],
                difficulties: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
            });
        } finally {
            setLoadingFilters(false);
        }
    };

    // Record problem attempt to analytics manager
    const recordProblemAttempt = (isCorrect: boolean, timeSpent: number, userAnswer: string, xpGained: number) => {
            const problem = getCurrentProblem();
            if (!problem || !problemAnalyticsManager) return;

            const attempt: ProblemAttempt = {
                problemId: problem.unique_problem_id,
                topic: problem.topic,
                difficulty: parseInt(problem.difficulty) || 5,
                source: problem.source || 'Unknown',
                isCorrect,
                timeSpent,
                answerGiven: userAnswer,
                xpEarned: xpGained,
                attemptedAt: new Date()
            };

            try {
                problemAnalyticsManager.recordAttempt(attempt);
                console.log(`Recorded ${isCorrect ? 'correct' : 'incorrect'} attempt for problem ${problem.unique_problem_id}`);
            } catch (error) {
                console.error('Failed to record problem attempt:', error);
            }
    };

    const loadProblems = async () => {
    setLoading(true);
    try {
        // Strategy: Use database-level randomization with larger sample size
        
        // First, get a count of available problems to determine sample size
        let countQuery = supabase
            .from('Problems_DataBank')
            .select('*', { count: 'exact', head: true });

        if (filters.topic) {
            countQuery = countQuery.eq('topic', filters.topic);
        }
        countQuery = countQuery.eq('difficulty', filters.difficulty.toString());

        const { count, error: countError } = await countQuery;
        
        if (countError) {
            console.error('Error getting problem count:', countError);
        }

        // Calculate sample size - get 5-10x more than needed (min 50, max 500)
        const availableProblems = count || 1000; // Fallback if count fails
        const multiplier = Math.min(Math.max(5, Math.ceil(50 / filters.problemCount)), 10);
        const sampleSize = Math.min(
            Math.max(filters.problemCount * multiplier, 50), 
            Math.min(500, availableProblems)
        );

        console.log(`Sampling ${sampleSize} from ~${availableProblems} available problems`);

        // Use database randomization with TABLESAMPLE or random ordering
        let query = supabase
            .from('Problems_DataBank')
            .select('*');

        // Apply filters
        if (filters.topic) {
            query = query.eq('topic', filters.topic);
        }
        query = query.eq('difficulty', filters.difficulty.toString());

        // Add session-based offset for variety across sessions
        const sessionOffset = Math.floor(Math.random() * Math.max(1, availableProblems - sampleSize));
        
        const { data, error } = await query
            .range(sessionOffset, sessionOffset + sampleSize - 1);

        if (error) {
            console.error('Error fetching problems:', error);
            throw error;
        }

        // Filter out problems with missing essential data
        const validProblems = (data || []).filter(problem => 
            problem.problem && problem.problem.trim() !== ''
        );

        if (validProblems.length === 0) {
            setProblems([]);
            return [];
        }

        // Client-side Fisher-Yates shuffle on the smaller sample
        const shuffleArray = (array: Problem[]) => {
            const shuffled = [...array];
            
            // Add timestamp entropy for cross-session variation
            const entropy = Date.now() % 1000;
            
            for (let i = shuffled.length - 1; i > 0; i--) {
                // Multiple random calls for better distribution
                const rand1 = Math.random();
                const rand2 = Math.random();
                const combined = (rand1 + rand2 + entropy / 1000) % 1;
                const j = Math.floor(combined * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
            return shuffled;
        };

        const shuffledProblems = shuffleArray(validProblems);
        const selectedProblems = shuffledProblems.slice(0, Math.min(filters.problemCount, shuffledProblems.length));
        
        // Log for debugging
        console.log(`Selected ${selectedProblems.length} problems from ${validProblems.length} sampled problems`);
        console.log('Sample range:', sessionOffset, 'to', sessionOffset + sampleSize - 1);
        console.log('Selected problem IDs:', selectedProblems.map(p => p.unique_problem_id));
        
        setProblems(selectedProblems);
        setShowProblems(true);
        return selectedProblems;
    } catch (error) {
        console.error('Error loading problems:', error);
        setProblems([]);
        return [];
    } finally {
        setLoading(false);
    }
};

    const handleStartPractice = async () => {
        const loadedProblems = await loadProblems();
        if (loadedProblems.length === 0) {
            alert('No problems found with the selected criteria. Please adjust your filters.');
        }
    };

    const handleTopicSelect = (topic: string) => {
        setFilters(prev => ({ ...prev, topic }));
        setShowDropdowns(prev => ({ ...prev, topic: false }));
    };

    const toggleTopicDropdown = () => {
        setShowDropdowns(prev => ({ ...prev, topic: !prev.topic }));
    };

    const handleBackToFilters = () => {
        setShowProblems(false);
        setShowReview(false);
        setProblems([]);
        setProblemStates({});
        setIsActive(false);
        setCurrentProblemIndex(0);
    };

    // Enhanced answer comparison function that handles LaTeX
    const normalizeAnswer = (answer: string): string => {
        return answer
            .replace(/\$+/g, '') // Remove LaTeX delimiters
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim()
            .toUpperCase();
    };

    const isMultipleChoice = (answer: string): boolean => {
        const trimmedAnswer = normalizeAnswer(answer);
        return ['A', 'B', 'C', 'D', 'E'].includes(trimmedAnswer);
    };

    // Handle bookmark toggle
    const toggleBookmark = () => {
        const problem = getCurrentProblem();
        if (!problem) return;
        
        setProblemStates(prev => ({
            ...prev,
            [problem.unique_problem_id]: {
                ...prev[problem.unique_problem_id],
                isBookmarked: !prev[problem.unique_problem_id]?.isBookmarked
            }
        }));
    };

    // Handle answer input change
    const handleAnswerChange = (value: string) => {
        const problem = getCurrentProblem();
        if (!problem) return;
        
        setProblemStates(prev => ({
            ...prev,
            [problem.unique_problem_id]: {
                ...prev[problem.unique_problem_id],
                userAnswer: value
            }
        }));
    };

    // Handle time up
    const handleTimeUp = () => {
        const problem = getCurrentProblem();
        if (!problem) return;

        const timeSpent = Math.floor((Date.now() - problemStartTime) / 1000);
        
        setProblemStates(prev => ({
            ...prev,
            [problem.unique_problem_id]: {
                ...prev[problem.unique_problem_id],
                isSubmitted: true,
                isCorrect: false,
                showSolution: true,
                timeSpent: timeSpent,
                xpGained: 0
            }
        }));
        recordProblemAttempt(false, timeSpent, '', 0);
        setIsActive(false);
    };

    // Helper function to add XP and handle level up notifications
    const addXPToManager = (amount: number, source: string): { leveledUp: boolean; newLevel?: number; oldLevel?: number } => {
        if (amount <= 0) {
            return { leveledUp: false };
        }

        try {
            const result = xpManager.addXP(amount, source);
            
            // Refresh the XP context state immediately
            refreshXPState();
            
            if (result.leveledUp && result.oldLevel && result.newLevel) {
                showLevelUp(result.oldLevel, result.newLevel);
                console.log(`🎉 Level up! From ${result.oldLevel} to ${result.newLevel}`);
            }
            return result;

        } catch (error) {
            console.error('Error adding XP:', error);
            return { leveledUp: false };
        }
    };

    const handleSubmitAnswer = () => {
        const problem = getCurrentProblem();
        const state = getCurrentProblemState();
        if (!problem || !state.userAnswer.trim()) return;

        const timeSpent = Math.floor((Date.now() - problemStartTime) / 1000);
        const isCorrect = normalizeAnswer(state.userAnswer) === normalizeAnswer(problem.answer);
        
        let xpGained = 0;
        let levelUpResult = { leveledUp: false };
        
        if (isCorrect) {
            const baseDifficulty = parseInt(problem.difficulty) || 5;
            const baseXP = baseDifficulty * 2;
            const timeBonus = Math.max(0, Math.floor((180 - timeSpent) / 10));
            xpGained = baseXP + timeBonus;
            
            const source = `${problem.topic} Problem (Level ${problem.difficulty})`;
            levelUpResult = addXPToManager(xpGained, source);
        }
        
        setProblemStates(prev => ({
            ...prev,
            [problem.unique_problem_id]: {
                ...prev[problem.unique_problem_id],
                isSubmitted: true,
                isCorrect: isCorrect,
                showSolution: true,
                timeSpent: timeSpent,
                xpGained: xpGained
            }
        }));
        
        
        recordProblemAttempt(isCorrect, timeSpent, state.userAnswer, xpGained);
        setIsActive(false);
    };

    // Handle multiple choice selection
    const handleMultipleChoiceSelect = (option: string) => {
        const problem = getCurrentProblem();
        if (!problem) return;

        const timeSpent = Math.floor((Date.now() - problemStartTime) / 1000);
        const isCorrect = option === normalizeAnswer(problem.answer);
        
        let xpGained = 0;
        let levelUpResult = { leveledUp: false };
        
        if (isCorrect) {
            const baseDifficulty = parseInt(problem.difficulty) || 5;
            const baseXP = baseDifficulty * 2;
            const timeBonus = Math.max(0, Math.floor((180 - timeSpent) / 10));
            xpGained = baseXP + timeBonus;
            
            const source = `${problem.topic} Problem (Level ${problem.difficulty})`;
            levelUpResult = addXPToManager(xpGained, source);
        }
        
        setProblemStates(prev => ({
            ...prev,
            [problem.unique_problem_id]: {
                ...prev[problem.unique_problem_id],
                userAnswer: option,
                isSubmitted: true,
                isCorrect: isCorrect,
                showSolution: true,
                timeSpent: timeSpent,
                xpGained: xpGained
            }
        }));
        
        
        recordProblemAttempt(isCorrect, timeSpent, option, xpGained);
        setIsActive(false);
    };

    useEffect(() => {
    if (showReview && !sessionXPSaved && !savingInProgressRef.current) {
        // Auto-save when review is shown (session completed) - but only once
        const saveSessionData = async () => {
            if (savingInProgressRef.current) {
                console.log('Save already in progress, skipping...');
                return;
            }
            
            savingInProgressRef.current = true;
            try {
                console.log('Starting session data save...');
                
                // Save XP
                refreshXPState();
                
                // Save problem analytics if available
                if (problemAnalyticsManager) {
                    try {
                        await problemAnalyticsManager.saveStats();
                        console.log('✅ Problem analytics saved successfully');
                    } catch (error) {
                        console.error('❌ Failed to save problem analytics:', error);
                    }
                }
                
                // Save bookmarks
                const bookmarkedProblemIds = Object.entries(problemStates)
                    .filter(([_, state]) => state.isBookmarked)
                    .map(([problemId, _]) => problemId);
                
                if (bookmarkedProblemIds.length > 0) {
                    await saveBookmarksToDatabase(bookmarkedProblemIds);
                    console.log(`✅ Saved ${bookmarkedProblemIds.length} bookmarks`);
                }
                
                setSessionXPSaved(true);
                console.log('✅ Session data saved successfully');
            } catch (error) {
                console.error('❌ Failed to save session data:', error);
            } finally {
                savingInProgressRef.current = false;
            }
        };
        
        saveSessionData();
    }
}, [showReview, sessionXPSaved, problemStates, user, problemAnalyticsManager]);

    useEffect(() => {
        if (showProblems && !showReview) {
            setSessionXPSaved(false);
            savingInProgressRef.current = false;
        }
    }, [showProblems, showReview]);

    // Toggle hint
    const toggleHint = () => {
        const problem = getCurrentProblem();
        if (!problem) return;
        
        setProblemStates(prev => ({
            ...prev,
            [problem.unique_problem_id]: {
                ...prev[problem.unique_problem_id],
                showHint: !prev[problem.unique_problem_id]?.showHint
            }
        }));
    };

    // Next problem
    const nextProblem = () => {
        if (currentProblemIndex < problems.length - 1) {
            setCurrentProblemIndex(prev => prev + 1);
            setProblemStartTime(Date.now());
            setTimeLeft(180);
            setIsActive(true);
        } else {
            // All problems completed, show review
            setShowReview(true);
            setIsActive(false);
        }
    };

    // Calculate session stats
    const calculateSessionStats = (): SessionStats => {
        const states = Object.values(problemStates);
        const submittedStates = states.filter(state => state.isSubmitted);
        const correctAnswers = submittedStates.filter(state => state.isCorrect).length;
        const totalTimeSpent = submittedStates.reduce((sum, state) => sum + state.timeSpent, 0);
        const totalXP = submittedStates.reduce((sum, state) => sum + state.xpGained, 0);
        const bookmarkedProblems = Object.entries(problemStates)
            .filter(([_, state]) => state.isBookmarked)
            .map(([problemId, _]) => problemId);
        
        const difficultyBreakdown: Record<string, { correct: number; total: number }> = {};
        const topicBreakdown: Record<string, { correct: number; total: number }> = {};
        
        problems.forEach(problem => {
            const state = problemStates[problem.unique_problem_id];
            if (state?.isSubmitted) {
                // Difficulty breakdown
                if (!difficultyBreakdown[problem.difficulty]) {
                    difficultyBreakdown[problem.difficulty] = { correct: 0, total: 0 };
                }
                difficultyBreakdown[problem.difficulty].total++;
                if (state.isCorrect) difficultyBreakdown[problem.difficulty].correct++;
                
                // Topic breakdown
                if (!topicBreakdown[problem.topic]) {
                    topicBreakdown[problem.topic] = { correct: 0, total: 0 };
                }
                topicBreakdown[problem.topic].total++;
                if (state.isCorrect) topicBreakdown[problem.topic].correct++;
            }
        });
        
        return {
            totalQuestions: submittedStates.length,
            correctAnswers,
            totalTimeSpent,
            averageTimePerQuestion: submittedStates.length > 0 ? totalTimeSpent / submittedStates.length : 0,
            accuracy: submittedStates.length > 0 ? (correctAnswers / submittedStates.length) * 100 : 0,
            totalXP,
            difficultyBreakdown,
            topicBreakdown,
            bookmarkedProblems
        };
    };

    // Format time
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get difficulty color
    const getDifficultyColor = (difficulty: string) => {
        const diff = parseInt(difficulty) || 5;
        if (diff <= 3) return "bg-green-600/20 text-green-400 border-green-600/30";
        if (diff <= 7) return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
        return "bg-red-600/20 text-red-400 border-red-600/30";
    };

    if (!isOpen) return null;

    // Review page
    if (showReview) {
        const stats = calculateSessionStats();
        
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <Card className="bg-gray-800 border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700">
                        <CardTitle className="flex items-center gap-3 text-white">
                            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <Trophy className="h-5 w-5 text-emerald-400" />
                            </div>
                            Practice Session Complete!
                        </CardTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClose}
                            className="text-gray-400 hover:text-white hover:bg-gray-700"
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </CardHeader>

                    <CardContent className="p-6 space-y-6">
                        {/* XP Progress Display */}
                        {xpManager && (
                            <Card className="bg-gradient-to-r from-purple-600/20 to-blue-600/20 border-purple-600/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Zap className="h-5 w-5 text-yellow-400" />
                                            <span className="text-white font-semibold">Level Progress</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-white">Level {xpManager.getCurrentProgress().current_level}</div>
                                            <div className="text-sm text-gray-400">{stats.totalXP} XP earned this session</div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-gray-300">Progress to next level</span>
                                            <span className="text-gray-400">
                                                {xpManager.getCurrentProgress().xp_towards_next} / 
                                                {Math.floor(100 * Math.pow(1.2, xpManager.getCurrentProgress().current_level - 1))} XP
                                            </span>
                                        </div>
                                        <Progress value={xpManager.getLevelProgress()} className="h-3" />
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Bookmarks Summary */}
                        {stats.bookmarkedProblems.length > 0 && (
                            <Card className="bg-gradient-to-r from-orange-600/20 to-red-600/20 border-orange-600/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BookmarkCheck className="h-5 w-5 text-orange-400" />
                                            <span className="text-white font-semibold">Problems Bookmarked</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-lg font-bold text-orange-400">{stats.bookmarkedProblems.length}</div>
                                            <div className="text-sm text-gray-400">
                                                {savingBookmarks ? 'Saving...' : 'Saved to your collection'}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Overall Stats */}
                        <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-600/30">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-emerald-400">{stats.correctAnswers}/{stats.totalQuestions}</div>
                                        <div className="text-gray-400 text-sm">Correct Answers</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-blue-400">{stats.accuracy.toFixed(1)}%</div>
                                        <div className="text-gray-400 text-sm">Accuracy</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-yellow-400">{stats.totalXP}</div>
                                        <div className="text-gray-400 text-sm">XP Earned</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-purple-400">{formatTime(stats.totalTimeSpent)}</div>
                                        <div className="text-gray-400 text-sm">Total Time</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Performance Breakdown */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Topic Performance */}
                            <Card className="bg-gray-900/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg">Topic Performance</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.entries(stats.topicBreakdown).map(([topic, data]) => (
                                        <div key={topic}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-300">{topic}</span>
                                                <span className="text-gray-400">{data.correct}/{data.total}</span>
                                            </div>
                                            <Progress value={(data.correct / data.total) * 100} className="h-2" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

                            {/* Difficulty Performance */}
                            <Card className="bg-gray-900/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg">Difficulty Performance</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.entries(stats.difficultyBreakdown)
                                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                                        .map(([difficulty, data]) => (
                                        <div key={difficulty}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-300">Level {difficulty}</span>
                                                <span className="text-gray-400">{data.correct}/{data.total}</span>
                                            </div>
                                            <Progress value={(data.correct / data.total) * 100} className="h-2" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={handleBackToFilters}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Practice Again
                            </Button>
                            <Button
                                onClick={onClose}
                                variant="outline"
                                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                            >
                                Close
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="bg-gray-800 border-gray-700 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700">
                    <CardTitle className="flex items-center gap-3 text-white">
                        <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <Target className="h-5 w-5 text-emerald-400" />
                        </div>
                        {showProblems ? `Practice Problems` : 'Practice Problems'}
                    </CardTitle>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </CardHeader>

                <CardContent className="p-6 space-y-6">
                    {!showProblems ? (
                        <>
                            {/* Topic Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Subject/Topic</label>
                                <div className="relative">
                                    <button
                                        onClick={toggleTopicDropdown}
                                        disabled={loadingFilters}
                                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-left hover:bg-gray-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                                    >
                                        <span>
                                            {loadingFilters ? 'Loading topics...' : (filters.topic || 'All Topics')}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showDropdowns.topic ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showDropdowns.topic && !loadingFilters && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                            <button
                                                onClick={() => handleTopicSelect('')}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors text-gray-300 border-b border-gray-700"
                                            >
                                                All Topics
                                            </button>
                                            {filterOptions.topics.map((topic) => (
                                                <button
                                                    key={topic}
                                                    onClick={() => handleTopicSelect(topic)}
                                                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                                                        filters.topic === topic ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300'
                                                    }`}
                                                >
                                                    {topic}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Difficulty Selection */}
                            <div className="space-y-4">
                                <label className="text-sm font-medium text-gray-300">Problem Difficulty</label>
                                
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">Difficulty Level: {filters.difficulty}</span>
                                        <span className="text-xs text-gray-400">
                                            {filters.difficulty <= 3 ? 'Easy' : filters.difficulty <= 7 ? 'Medium' : 'Hard'}
                                        </span>
                                    </div>
                                    <input
                                        type="range"
                                        min="1"
                                        max="10"
                                        value={filters.difficulty}
                                        onChange={(e) => setFilters(prev => ({ 
                                            ...prev, 
                                            difficulty: Number(e.target.value)
                                        }))}
                                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                        style={{
                                            background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${(filters.difficulty - 1) * 11.11}%, #475569 ${(filters.difficulty - 1) * 11.11}%, #475569 100%)`
                                        }}
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>1</span>
                                        <span>2</span>
                                        <span>3</span>
                                        <span>4</span>
                                        <span>5</span>
                                        <span>6</span>
                                        <span>7</span>
                                        <span>8</span>
                                        <span>9</span>
                                        <span>10</span>
                                    </div>
                                </div>
                            </div>

                            {/* Number of Problems */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Number of Problems</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {[5, 10, 15, 20].map((count) => (
                                        <button
                                            key={count}
                                            onClick={() => setFilters(prev => ({ ...prev, problemCount: count }))}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                filters.problemCount === count
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {count}
                                        </button>
                                    ))}
                                </div>
                                <div className="mt-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={filters.problemCount}
                                        onChange={(e) => setFilters(prev => ({ 
                                            ...prev, 
                                            problemCount: Math.min(50, Math.max(1, Number(e.target.value))) 
                                        }))}
                                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Custom number (1-50)"
                                    />
                                </div>
                            </div>

                            {/* Filter Summary */}
                            <div className="bg-gray-900/50 rounded-lg p-4 space-y-2">
                                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                                    <Filter className="h-4 w-4" />
                                    Filter Summary
                                </h4>
                                <div className="text-xs text-gray-400 space-y-1">
                                    <p><span className="text-gray-300">Topic:</span> {filters.topic || 'All Topics'}</p>
                                    <p><span className="text-gray-300">Difficulty:</span> {filters.difficulty}/10 ({filters.difficulty <= 3 ? 'Easy' : filters.difficulty <= 7 ? 'Medium' : 'Hard'})</p>
                                    <p><span className="text-gray-300">Problems:</span> {filters.problemCount}</p>
                                </div>
                            </div>

                            {/* XP Information */}
                            {xpManager && (
                                <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Zap className="h-4 w-4 text-purple-400" />
                                        <span className="text-xs font-medium text-purple-400">XP Progress</span>
                                    </div>
                                    <div className="text-xs text-gray-400 space-y-1">
                                        <p>Current Level: <span className="text-purple-400 font-semibold">{xpManager.getCurrentProgress().current_level}</span></p>
                                        <p>XP to Next Level: <span className="text-purple-400 font-semibold">{Math.floor(100 * Math.pow(1.2, xpManager.getCurrentProgress().current_level - 1)) - xpManager.getCurrentProgress().xp_towards_next}</span></p>
                                        <p>Earn 2-20+ XP per correct answer based on difficulty and speed!</p>
                                    </div>
                                </div>
                            )}

                            {/* Bookmark Information */}
                            <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <Bookmark className="h-4 w-4 text-orange-400" />
                                    <span className="text-xs font-medium text-orange-400">Bookmark Problems</span>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Bookmark interesting or challenging problems during practice to save them for later review. 
                                    Your bookmarks are automatically saved at the end of each session.
                                </p>
                            </div>

                            {/* Database Info */}
                            {/* <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                                    <span className="text-xs font-medium text-blue-400">Database Connection</span>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Connected to Problems_DataBank table with {filterOptions.topics.length} topics and {filterOptions.difficulties.length} difficulty levels available
                                </p>
                            </div> */}

                            {/* Start Practice Button */}
                            <Button
                                onClick={handleStartPractice}
                                disabled={loading || loadingFilters}
                                className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white py-3 font-medium"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Loading Problems...
                                    </>
                                ) : (
                                    <>
                                        <Play className="h-4 w-4 mr-2" />
                                        Start Practice Session
                                    </>
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Progress and Stats Bar */}
                            <Card className="bg-gray-800 border-gray-700">
                                <CardContent className="p-4">
                                    <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center space-x-4">
                                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                                                Problem {currentProblemIndex + 1} of {problems.length}
                                            </Badge>
                                            <Badge className={getDifficultyColor(getCurrentProblem()?.difficulty || '5')}>
                                                Level {getCurrentProblem()?.difficulty || '5'}
                                            </Badge>
                                            <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                                                {getCurrentProblem()?.topic || ''}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center space-x-6">
                                            <div className="flex items-center space-x-2">
                                                <Clock className="h-4 w-4 text-gray-400" />
                                                <span className={`font-mono ${timeLeft < 30 ? "text-red-400" : "text-gray-300"}`}>
                                                    {formatTime(timeLeft)}
                                                </span>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <Target className="h-4 w-4 text-green-400" />
                                                <span className="text-green-400 font-semibold">
                                                    Score: {Object.values(problemStates).filter(s => s.isCorrect).length}
                                                </span>
                                            </div>
                                            {getCurrentProblemState().xpGained > 0 && (
                                                <div className="flex items-center space-x-2">
                                                    <Zap className="h-4 w-4 text-yellow-400" />
                                                    <span className="text-yellow-400 font-semibold">+{getCurrentProblemState().xpGained} XP</span>
                                                </div>
                                            )}
                                            {xpManager && (
                                                <div className="flex items-center space-x-2">
                                                    <TrendingUp className="h-4 w-4 text-purple-400" />
                                                    <span className="text-purple-400 font-semibold">Lvl {xpManager.getCurrentProgress().current_level}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <Progress value={((180 - timeLeft) / 180) * 100} className="mt-3" />
                                </CardContent>
                            </Card>

                            {/* Current Problem */}
                            <Card className="bg-gray-800 border-gray-700">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0">
                                    <CardTitle className="text-white text-xl flex-1">
                                        <MathRenderer content={getCurrentProblem()?.problem || ''} />
                                    </CardTitle>
                                    <Button
                                        onClick={toggleBookmark}
                                        variant="ghost"
                                        size="sm"
                                        className={`ml-4 flex-shrink-0 ${
                                            getCurrentProblemState().isBookmarked
                                                ? "text-orange-400 hover:text-orange-300"
                                                : "text-gray-400 hover:text-orange-400"
                                        }`}
                                    >
                                        {getCurrentProblemState().isBookmarked ? (
                                            <BookmarkCheck className="h-5 w-5" />
                                        ) : (
                                            <Bookmark className="h-5 w-5" />
                                        )}
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {/* Answer Options */}
                                    {isMultipleChoice(getCurrentProblem()?.answer || '') ? (
                                        <div className="grid gap-3">
                                            {['A', 'B', 'C', 'D', 'E'].map((option, index) => {
                                                const state = getCurrentProblemState();
                                                const problem = getCurrentProblem();
                                                const correctAnswer = normalizeAnswer(problem?.answer || '');
                                                
                                                return (
                                                    <button
                                                        key={option}
                                                        onClick={() => !state.isSubmitted && handleMultipleChoiceSelect(option)}
                                                        disabled={state.isSubmitted}
                                                        className={`p-4 text-left rounded-lg border transition-all duration-200 ${
                                                            state.isSubmitted
                                                                ? option === correctAnswer
                                                                    ? "bg-green-600/20 border-green-600 text-green-400"
                                                                    : option === state.userAnswer && option !== correctAnswer
                                                                        ? "bg-red-600/20 border-red-600 text-red-400"
                                                                        : "bg-gray-700 border-gray-600 text-gray-400"
                                                                : state.userAnswer === option
                                                                    ? "bg-blue-600/20 border-blue-600 text-blue-400"
                                                                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500"
                                                        }`}
                                                    >
                                                        <div className="flex items-center space-x-3">
                                                            <span className="font-semibold">({option})</span>
                                                            <span>Option {option}</span>
                                                            {state.isSubmitted && option === correctAnswer && (
                                                                <Check className="h-5 w-5 text-green-400 ml-auto" />
                                                            )}
                                                            {state.isSubmitted && option === state.userAnswer && option !== correctAnswer && (
                                                                <XCircle className="h-5 w-5 text-red-400 ml-auto" />
                                                            )}
                                                        </div>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            <div className="flex gap-3">
                                                <input
                                                    type="text"
                                                    value={getCurrentProblemState().userAnswer}
                                                    onChange={(e) => handleAnswerChange(e.target.value)}
                                                    disabled={getCurrentProblemState().isSubmitted}
                                                    className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                    placeholder="Enter your answer (you can use LaTeX like $x^2$ or $\frac{1}{2}$)..."
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter') {
                                                            handleSubmitAnswer();
                                                        }
                                                    }}
                                                />
                                                {!getCurrentProblemState().isSubmitted && (
                                                    <Button
                                                        onClick={handleSubmitAnswer}
                                                        disabled={!getCurrentProblemState().userAnswer.trim()}
                                                        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-6"
                                                    >
                                                        Submit
                                                    </Button>
                                                )}
                                            </div>
                                            
                                            {/* LaTeX Preview for user input */}
                                            {getCurrentProblemState().userAnswer && !getCurrentProblemState().isSubmitted && (
                                                <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3">
                                                    <div className="text-xs text-gray-400 mb-1">Your answer preview:</div>
                                                    <MathRenderer content={getCurrentProblemState().userAnswer} className="text-gray-300" />
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-3 pt-4">
                                        {!getCurrentProblemState().isSubmitted ? (
                                            <Button
                                                onClick={toggleHint}
                                                variant="outline"
                                                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                            >
                                                <Lightbulb className="h-4 w-4 mr-2" />
                                                {getCurrentProblemState().showHint ? "Hide Hint" : "Show Hint"}
                                            </Button>
                                        ) : (
                                            <div className="flex gap-3">
                                                {currentProblemIndex < problems.length - 1 ? (
                                                    <Button onClick={nextProblem} className="bg-green-600 hover:bg-green-700">
                                                        Next Problem
                                                        <ArrowRight className="h-4 w-4 ml-2" />
                                                    </Button>
                                                ) : (
                                                    <Button onClick={nextProblem} className="bg-purple-600 hover:bg-purple-700">
                                                        <Trophy className="h-4 w-4 mr-2" />
                                                        View Results
                                                    </Button>
                                                )}
                                            </div>
                                        )}
                                    </div>

                                    {/* Hint */}
                                    {getCurrentProblemState().showHint && getCurrentProblem()?.solution && (
                                        <Card className="bg-yellow-600/10 border-yellow-600/30">
                                            <CardContent className="p-4">
                                                <div className="flex items-start space-x-2">
                                                    <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                                    <div className="flex-1">
                                                        <div className="text-yellow-400 font-semibold mb-2">Hint:</div>
                                                        <div className="text-gray-300">
                                                            <MathRenderer content={getCurrentProblem()?.solution?.substring(0, 200) + '...' || ''} />
                                                        </div>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    )}

                                    {/* Result and Explanation */}
                                    {getCurrentProblemState().isSubmitted && (
                                        <div className="space-y-4">
                                            {/* Correct Answer */}
                                            <Card className="bg-blue-600/10 border-blue-600/30">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start space-x-2">
                                                        <div className="flex-shrink-0">
                                                            {getCurrentProblemState().isCorrect ? (
                                                                <Check className="h-5 w-5 text-green-400 mt-0.5" />
                                                            ) : (
                                                                <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1">
                                                            <div className={`font-semibold mb-2 ${
                                                                getCurrentProblemState().isCorrect ? "text-green-400" : "text-red-400"
                                                            }`}>
                                                                {getCurrentProblemState().isCorrect ? "Correct!" : "Incorrect"}
                                                                {getCurrentProblemState().isCorrect && getCurrentProblemState().xpGained > 0 && (
                                                                    <span className="text-yellow-400 ml-2">+{getCurrentProblemState().xpGained} XP earned!</span>
                                                                )}
                                                            </div>
                                                            <div className="text-gray-300 mb-3">
                                                                <strong>Correct Answer:</strong>
                                                                <div className="mt-1">
                                                                    <MathRenderer content={getCurrentProblem()?.answer || ''} />
                                                                </div>
                                                            </div>
                                                            {getCurrentProblem()?.solution && (
                                                                <div className="text-gray-300">
                                                                    <strong>Solution:</strong>
                                                                    <div className="mt-1">
                                                                        <MathRenderer content={getCurrentProblem()?.solution || ''} />
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Back Button */}
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleBackToFilters}
                                    variant="outline"
                                    size="sm"
                                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                >
                                    ← Back to Setup
                                </Button>
                                <div className="text-sm text-gray-400 flex items-center gap-2">
                                    <span>Progress: {Object.values(problemStates).filter(s => s.isSubmitted).length}/{problems.length} completed</span>
                                    {Object.values(problemStates).filter(s => s.isBookmarked).length > 0 && (
                                        <>
                                            <span>•</span>
                                            <span className="flex items-center gap-1">
                                                <Bookmark className="h-3 w-3 text-orange-400" />
                                                {Object.values(problemStates).filter(s => s.isBookmarked).length} bookmarked
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            <LevelUpNotification
                isVisible={notification.isVisible}
                oldLevel={notification.oldLevel}
                newLevel={notification.newLevel}
                onClose={hideLevelUp}
            />
            
        </div>
    );
}