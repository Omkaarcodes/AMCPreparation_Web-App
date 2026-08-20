import React, { useState, useEffect, useRef } from 'react';
import { X, Target, Filter, Play, ChevronDown, Loader2, Check, XCircle, Clock, Trophy, RotateCcw, ArrowRight, Zap, TrendingUp, AlertCircle, BookOpen, BookMarked, ArrowLeft, Bookmark, BookmarkCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { supabase } from '../supabase-client';
import ErrorJournalEntry from '../../components/ErrorJournalEntry';
import {useXP} from '../../hooks/contexts/XPContext';
import {useProblemAnalytics} from "../../hooks/contexts/ProblemContext";
import { ProblemAttempt, ProblemAnalyticsManager } from '../../components/ProblemManager';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

import { toast, Toaster } from 'sonner';

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
    bookmarked?: boolean;
    problem_number: string;
    dataset_origin: string;
    difficulty_1: string;
}

interface ExamFilters {
    source: string;
    questionType: string; // 'MCQ', 'Short Answer', or 'All'
    timeLimit: number; // in minutes
    problemCount: number;
    topic?: string;
    difficulty?: string;
}

interface MockExamProps {
    isOpen?: boolean;
    onClose?: () => void;
}

interface ExamState {
    userAnswers: Record<string, string>;
    isSubmitted: boolean;
    timeRemaining: number;
    examStartTime: number;
    showResults: boolean;
    bookmarkedProblems: Set<string>;
}

interface SolutionVisibility {
    [problemId: string]: boolean;
}

interface ExamStats {
    totalQuestions: number;
    correctAnswers: number;
    accuracy: number;
    timeSpent: number;
    totalXP: number;
    sourceBreakdown: Record<string, { correct: number; total: number }>;
    difficultyBreakdown: Record<string, { correct: number; total: number }>;
    topicBreakdown: Record<string, { correct: number; total: number }>;
}

const MathRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = "" }) => {
    const renderMathContent = (text: string) => {
        if (!text) return null;
        
        // Enhanced regex to handle more LaTeX environments and edge cases
        // This regex matches:
        // 1. LaTeX environments: \begin{...}...\end{...} (with proper nesting support)
        // 2. Display math: $...$ and \[...\]
        // 3. Inline math: \(...\) and $...$
        // 4. LaTeX commands: \command{...}
        // Updated to better handle nested braces and complex environments
        const mathRegex = /(\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]*?\$|\\\w+(?:\{(?:[^{}]|\{[^}]*\})*\})*)/g;
        
        const parts = text.split(mathRegex);
        
        return parts.map((part, index) => {
            if (!part) return null;
            
            // Handle LaTeX environments like \begin{cases}...\end{cases}, \begin{align}...\end{align}
            if (part.match(/\\begin\{[^}]+\}/)) {
                try {
                    // Clean up the LaTeX for better parsing
                    let cleanLatex = part
                        .replace(/\\quad/g, '\\;\\;\\;\\;') // Replace \quad with spacing
                        .replace(/\\qquad/g, '\\;\\;\\;\\;\\;\\;\\;\\;') // Replace \qquad with more spacing
                        .replace(/~Steven Chen.*?www\.professorchenedu\.com\)/g, '') // Remove attribution text
                        .replace(/~\w+.*?\)/g, '') // Remove other attribution patterns
                        .replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}') // Convert \text{} to \mathrm{} for better compatibility
                        .replace(/\$([^$]*)\$/g, '$1') // Remove nested $ symbols within environments
                        .trim();
                    
                    // Special handling for cases environment
                    if (cleanLatex.includes('\\begin{cases}')) {
                        // Ensure proper spacing and structure for cases
                        cleanLatex = cleanLatex
                            .replace(/\\begin\{cases\}/g, '\\begin{cases}')
                            .replace(/\\end\{cases\}/g, '\\end{cases}')
                            .replace(/&\s*\\text\{/g, '& \\mathrm{') // Replace &\text{ with &\mathrm{
                            .replace(/\}\s*\\\\/g, '} \\\\'); // Ensure proper line endings
                    }
                    
                    return <BlockMath key={index} math={cleanLatex} />;
                } catch (error) {
                    console.error('LaTeX parsing error (environment):', error, 'LaTeX:', part);
                    // Fallback: try to render as inline math if it's a simple case
                    const simplePattern = part.replace(/\\begin\{cases\}|\\\\/g, '').replace(/\\end\{cases\}/g, '');
                    try {
                        return <InlineMath key={index} math={simplePattern} />;
                    } catch (fallbackError) {
                        // Final fallback: render as formatted text
                        return (
                            <div key={index} className="bg-yellow-600/10 border border-yellow-600/20 rounded p-2 my-2">
                                <div className="text-xs text-yellow-400 mb-1">Complex LaTeX (viewing as text):</div>
                                <pre className="text-gray-300 text-sm whitespace-pre-wrap font-mono">{part}</pre>
                            </div>
                        );
                    }
                }
            } 
            // Handle display math with $$...$$
            else if (part.startsWith('$$') && part.endsWith('$$')) {
                const latex = part.slice(2, -2).trim();
                if (!latex) return null;
                
                try {
                    // Clean up the LaTeX
                    let cleanLatex = latex
                        .replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}') // Convert \text{} to \mathrm{}
                        .replace(/\\quad/g, '\\;\\;\\;\\;')
                        .replace(/\\qquad/g, '\\;\\;\\;\\;\\;\\;\\;\\;')
                        .trim();
                    
                    return <BlockMath key={index} math={cleanLatex} />;
                } catch (error) {
                    console.error('LaTeX parsing error ($$):', error, 'LaTeX:', latex);
                    // Try as inline math fallback
                    try {
                        return <InlineMath key={index} math={latex} />;
                    } catch (fallbackError) {
                        return (
                            <div key={index} className="bg-yellow-600/10 border border-yellow-600/20 rounded p-2 my-1">
                                <div className="text-xs text-yellow-400 mb-1">LaTeX (viewing as text):</div>
                                <code className="text-gray-300">${latex}$</code>
                            </div>
                        );
                    }
                }
            } 
            // Handle display math with \[...\]
            else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                const latex = part.slice(2, -2).trim();
                if (!latex) return null;
                
                try {
                    let cleanLatex = latex
                        .replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}')
                        .replace(/\\quad/g, '\\;\\;\\;\\;')
                        .replace(/\\qquad/g, '\\;\\;\\;\\;\\;\\;\\;\\;')
                        .replace(/&\s*\\;\s*\\;\s*\\;\s*\\;\s*/g, '&\\quad') // Replace multiple \; with \quad
                        .replace(/\s+/g, ' ') // Normalize whitespace
                        .trim();
                    
                    // Special handling if it contains cases environment
                    if (cleanLatex.includes('\\begin{cases}')) {
                        cleanLatex = cleanLatex
                            .replace(/\\begin\{cases\}/g, '\\begin{cases}')
                            .replace(/\\end\{cases\}/g, '\\end{cases}')
                            .replace(/&\s*\\mathrm\{/g, '& \\mathrm{') // Ensure proper spacing before \mathrm
                            .replace(/\}\s*,\s*\\\\/g, '}, \\\\') // Ensure proper comma spacing
                            .replace(/\}\s*\.\s*\\\\/g, '}. \\\\') // Ensure proper period spacing
                            .replace(/\}\s*$/g, '}'); // Clean up trailing spaces
                    }
                    
                    return <BlockMath key={index} math={cleanLatex} />;
                } catch (error) {
                    console.error('LaTeX parsing error (\\[\\]):', error, 'LaTeX:', latex);
                    // Try splitting and handling the cases environment separately
                    if (latex.includes('\\begin{cases}')) {
                        try {
                            // Extract just the cases part and try to render it
                            const casesMatch = latex.match(/(.*?)(\\begin\{cases\}.*?\\end\{cases\})(.*)([\s\S]*)/);
                            if (casesMatch) {
                                const [, before, cases, after] = casesMatch;
                                const cleanCases = cases
                                    .replace(/&\s*\\;\s*\\;\s*\\;\s*\\;\s*/g, '&\\quad')
                                    .replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}');
                                const fullLatex = (before + cleanCases + after).trim();
                                return <BlockMath key={index} math={fullLatex} />;
                            }
                        } catch (casesError) {
                            console.error('Cases environment fallback failed:', casesError);
                        }
                    }
                    
                    // Final fallback
                    return (
                        <div key={index} className="bg-yellow-600/10 border border-yellow-600/20 rounded p-2 my-1">
                            <div className="text-xs text-yellow-400 mb-1">LaTeX (viewing as text):</div>
                            <code className="text-gray-300">\\[{latex}\\]</code>
                        </div>
                    );
                }
            } 
            // Handle inline math with \(...\)
            else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                const latex = part.slice(2, -2).trim();
                if (!latex) return null;
                
                try {
                    let cleanLatex = latex
                        .replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}')
                        .trim();
                    
                    return <InlineMath key={index} math={cleanLatex} />;
                } catch (error) {
                    console.error('LaTeX parsing error (\\(\\)):', error, 'LaTeX:', latex);
                    return <code key={index} className="text-yellow-400 bg-yellow-900/20 px-1 rounded">\\({latex}\\)</code>;
                }
            } 
            // Handle inline math with $...$
            else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                const latex = part.slice(1, -1).trim();
                if (!latex) return null;
                
                try {
                    let cleanLatex = latex
                        .replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}')
                        .trim();
                    
                    return <InlineMath key={index} math={cleanLatex} />;
                } catch (error) {
                    console.error('LaTeX parsing error ($):', error, 'LaTeX:', latex);
                    return <code key={index} className="text-yellow-400 bg-yellow-900/20 px-1 rounded">${latex}$</code>;
                }
            } 
            // Handle LaTeX commands like \boxed{147}, \lceil, \rfloor, etc.
            else if (part.match(/^\\\w+(?:\{[^}]*\})*$/)) {
                try {
                    let cleanLatex = part
                        .replace(/\\text\{([^}]*)\}/g, '\\mathrm{$1}')
                        .trim();
                    
                    return <InlineMath key={index} math={cleanLatex} />;
                } catch (error) {
                    console.error('LaTeX parsing error (command):', error, 'LaTeX:', part);
                    return <code key={index} className="text-yellow-400 bg-yellow-900/20 px-1 rounded">{part}</code>;
                }
            } 
            // Handle regular text with line breaks
            else {
                if (!part.trim()) return null;
                return part.split('\n').map((line, lineIndex) => (
                    <span key={`${index}-${lineIndex}`}>
                        {line}
                        {lineIndex < part.split('\n').length - 1 && <br />}
                    </span>
                ));
            }
        }).filter(Boolean); // Remove null entries
    };

    return (
        <div className={`math-content ${className}`}>
            {renderMathContent(content)}
        </div>
    );
};

export default function MockExam({ isOpen = true, onClose }: MockExamProps) {
    const [filters, setFilters] = useState<ExamFilters>({
        source: '',
        questionType: 'All',
        timeLimit: 75, // Default AMC time
        problemCount: 25, // Default AMC problem count
        topic: '',
        difficulty: ''
    });

    const [filterOptions, setFilterOptions] = useState({
        sources: [] as string[],
        topics: [] as string[],
        difficulties: [] as string[],
        questionTypes: [] as string[]
    });

    const [loading, setLoading] = useState(false);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [showDropdowns, setShowDropdowns] = useState({
        source: false,
        topic: false,
        difficulty: false
    });

    const [problems, setProblems] = useState<Problem[]>([]);
    const [showExam, setShowExam] = useState(false);
    const [examState, setExamState] = useState<ExamState>({
        userAnswers: {},
        isSubmitted: false,
        timeRemaining: 0,
        examStartTime: 0,
        showResults: false,
        bookmarkedProblems: new Set()
    });
    const navigate = useNavigate();
    // State for error journal entries
    const [completedReflections, setCompletedReflections] = useState<Set<string>>(new Set());

    const [solutionVisibility, setSolutionVisibility] = useState<SolutionVisibility>({});

    const [savingBookmarks, setSavingBookmarks] = useState(false);
    const [sessionBookmarksSaved, setSessionBookmarksSaved] = useState(false);
    const savingBookmarksRef = useRef(false);

    const { 
            xpManager, 
            xpProgress, 
            xpLoading, 
            unsavedXP, 
            isOnline, 
            awardXP, 
            getLevelProgress, 
            forceSave, 
            hasUnsavedChanges 
        } = useXP();
    
    const { problemManager } = useProblemAnalytics();
    
    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout | null = null;
        if (showExam && !examState.isSubmitted && examState.timeRemaining > 0) {
            interval = setInterval(() => {
                setExamState(prev => ({
                    ...prev,
                    timeRemaining: prev.timeRemaining - 1
                }));
            }, 1000);
        } else if (showExam && examState.timeRemaining === 0 && !examState.isSubmitted) {
            handleTimeUp();
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [showExam, examState.isSubmitted, examState.timeRemaining]);

    // Load filter options
    useEffect(() => {
        loadFilterOptions();
    }, []);

    const globalStyles = `
        * {
          font-family: 'Noto Serif JP', serif !important;
        }
      `;
    
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.textContent = globalStyles;
        document.head.appendChild(styleElement);
        
        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

  
    // Update the useEffect that handles bookmark saving (around line 212)

useEffect(() => {
    if (examState.showResults && !sessionBookmarksSaved && !savingBookmarksRef.current) {
        const saveSessionBookmarks = async () => {
            if (savingBookmarksRef.current) {
                console.log('Bookmark save already in progress, skipping...');
                return;
            }
            
            savingBookmarksRef.current = true;
            console.log('🔖 Starting bookmark save process...');
            console.log('Bookmarked problems:', Array.from(examState.bookmarkedProblems));
            
            try {
                const bookmarkedProblemIds = Array.from(examState.bookmarkedProblems);
                
                if (bookmarkedProblemIds.length === 0) {
                    console.log('No bookmarks to save');
                    setSessionBookmarksSaved(true);
                    return;
                }
                
                console.log('📤 Calling saveBookmarksToDatabase...');
                
                await saveBookmarksToDatabase(bookmarkedProblemIds);
                
            
                console.log('✅ Bookmark save successful');
                
                setSessionBookmarksSaved(true);
            } catch (error) {
                console.error('❌ Failed to save exam bookmarks:', error);
            } finally {
                savingBookmarksRef.current = false;
                console.log('🔖 Bookmark save process completed');
            }
        };
        
        saveSessionBookmarks();
    }
}, [examState.showResults, sessionBookmarksSaved, examState.bookmarkedProblems]);
    const loadFilterOptions = async () => {
        setLoadingFilters(true);
        try {
            const { data, error } = await supabase
                .from('Problems_DataBank')
                .select('source, topic, difficulty, question_type');

            if (error) {
                console.error('Error fetching filter options:', error);
                setFilterOptions({
                    sources: ['AMC 10', 'AMC 12', 'AIME', 'Other'],
                    topics: ['Algebra', 'Geometry', 'Number Theory', 'Combinatorics'],
                    difficulties: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                    questionTypes: ['MCQ', 'Short Answer']
                });
            } else {
                // Process sources: categorize anything not AMC 10/12 or AIME as "Other"
                const rawSources = new Set(data?.map(item => item.source).filter(Boolean));
                const categorizedSources = new Set<string>();
                
                rawSources.forEach(source => {
                    if (source.includes('AMC_10A') || source.includes('AMC_10B')) {
                        categorizedSources.add('AMC 10');
                    } else if (source.includes('AMC_12A') || source.includes('AMC_12B')) {
                        categorizedSources.add('AMC 12');
                    } else if (source.includes('AIME') || source.toLowerCase().includes('aime')) {
                        categorizedSources.add('AIME');
                    } else {
                        categorizedSources.add('Other');
                    }
                });

                const uniqueTopics = new Set(data?.map(item => item.topic).filter(Boolean));
                const uniqueDifficulties = new Set(data?.map(item => item.difficulty).filter(Boolean));
                const uniqueQuestionTypes = new Set(data?.map(item => item.question_type).filter(Boolean));

                setFilterOptions({
                    sources: Array.from(categorizedSources).sort(),
                    topics: Array.from(uniqueTopics).sort(),
                    difficulties: Array.from(uniqueDifficulties).sort((a, b) => {
                        const numA = parseInt(a);
                        const numB = parseInt(b);
                        if (!isNaN(numA) && !isNaN(numB)) {
                            return numA - numB;
                        }
                        return a.localeCompare(b);
                    }),
                    questionTypes: Array.from(uniqueQuestionTypes).filter(type => type).sort()
                });
            }
        } catch (error) {
            console.error('Error loading filter options:', error);
            setFilterOptions({
                sources: ['AMC 10', 'AMC 12', 'AIME', 'Other'],
                topics: ['Algebra', 'Geometry', 'Number Theory', 'Combinatorics'],
                difficulties: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'],
                questionTypes: ['MCQ', 'Short Answer']
            });
        } finally {
            setLoadingFilters(false);
        }
    };

    const loadProblems = async () => {
        setLoading(true);
        try {
            console.log('=== Starting loadProblems ===');
            console.log('Filters:', filters);
            
            // Step 1: First, get problems based on source filter only
            let sourceQuery = supabase
                .from('Problems_DataBank')
                .select('*');

            // Apply source filter
            if (filters.source && filters.source !== 'Other') {
                console.log(`Applying source filter: ${filters.source}`);
                
                if (filters.source === 'AMC 10') {
                    sourceQuery = sourceQuery.or('source.ilike.%AMC_10A%,source.ilike.%AMC_10B%');
                } else if (filters.source === 'AMC 12') {
                    sourceQuery = sourceQuery.or('source.ilike.%AMC_12A%,source.ilike.%AMC_12B%');
                } else if (filters.source === 'AIME') {
                    sourceQuery = sourceQuery.ilike('source', '%AIME%');
                }
            } else if (filters.source === 'Other') {
                sourceQuery = sourceQuery
                    .not('source', 'ilike', '%AMC_10%')
                    .not('source', 'ilike', '%AMC_12%')
                    .not('source', 'ilike', '%AIME%');
            }

            // Apply topic and difficulty filters (these work fine with the source filter)
            if (filters.topic) {
                console.log(`Applying topic filter: ${filters.topic}`);
                sourceQuery = sourceQuery.eq('topic', filters.topic);
            }
            if (filters.difficulty) {
                console.log(`Applying difficulty filter: ${filters.difficulty}`);
                sourceQuery = sourceQuery.eq('difficulty', filters.difficulty);
            }

            console.log('Executing source query...');
            const { data, error } = await sourceQuery
                .limit(filters.problemCount * 4) // Get extra for filtering
                .order('unique_problem_id', { ascending: false });

            if (error) {
                console.error('Query error:', error);
                throw error;
            }

            console.log(`Source query returned ${data?.length || 0} results`);

            if (data && data.length > 0) {
                console.log('Sample results:');
                data.slice(0, 3).forEach((item, index) => {
                    console.log(`  ${index + 1}. Source: "${item.source}", Type: "${item.question_type}"`);
                });
            }

            // Step 2: Filter locally for question type and data completeness
            let filteredData = data || [];

            // Apply question type filtering locally
            if (filters.questionType !== 'All') {
                console.log(`Applying question type filter: ${filters.questionType}`);
                
                const beforeCount = filteredData.length;
                
                if (filters.questionType === 'MCQ') {
                    filteredData = filteredData.filter(problem => {
                        // const questionType = (problem.question_type || '').toLowerCase();
                        const answer = (problem.answer || '').toUpperCase().trim();
                        
                        // const isMCQByType = questionType.includes('multiple') || 
                        //                    questionType.includes('mcq') || 
                        //                    questionType.includes('choice');
                        const isMCQByAnswer = ['A', 'B', 'C', 'D', 'E'].includes(answer);
                        
                        return isMCQByAnswer;
                    });
                } else {
                    // Short Answer
                    filteredData = filteredData.filter(problem => {
                        const questionType = (problem.question_type || '').toLowerCase();
                        const answer = (problem.answer || '').toUpperCase().trim();
                        
                        const isMCQByType = questionType.includes('multiple') || 
                                           questionType.includes('mcq') || 
                                           questionType.includes('choice');
                        const isMCQByAnswer = ['A', 'B', 'C', 'D', 'E'].includes(answer);
                        
                        return !isMCQByType && !isMCQByAnswer;
                    });
                }
                
                console.log(`Question type filter: ${beforeCount} -> ${filteredData.length} problems`);
            }

            // Filter out problems with missing essential data
            const beforeValidation = filteredData.length;
            const validProblems = filteredData.filter(problem => 
                problem.problem && problem.problem.trim() !== '' &&
                problem.answer && problem.answer.trim() !== ''
            );
            
            console.log(`Data validation: ${beforeValidation} -> ${validProblems.length} valid problems`);

            if (validProblems.length === 0) {
                console.log('❌ No valid problems found!');
                console.log('This might mean:');
                console.log('1. No problems exist for this source in the database');
                console.log('2. All problems are missing question_type data');
                console.log('3. The source names in database don\'t match our patterns');
                
                // Let's do a quick check
                const quickCheck = await supabase
                    .from('Problems_DataBank')
                    .select('source, question_type')
                    .ilike('source', '%AMC_12%')
                    .limit(5);
                
                console.log('Quick check for any AMC_12 sources:', quickCheck.data);
            }

            // Randomize and limit to requested count
            const shuffled = validProblems.sort(() => 0.5 - Math.random());
            const selectedProblems = shuffled.slice(0, filters.problemCount);
            
            console.log(`✅ Final selection: ${selectedProblems.length} problems`);
            
            setProblems(selectedProblems);
            
            // Initialize exam state
            const examStartTime = Date.now();
            setExamState({
                userAnswers: {},
                isSubmitted: false,
                timeRemaining: filters.timeLimit * 60,
                examStartTime,
                showResults: false,
                bookmarkedProblems: new Set()
            });
            
            // Reset completed reflections
            setCompletedReflections(new Set());
            
            setShowExam(true);
            return selectedProblems;
        } catch (error) {
            console.error('Error loading problems:', error);
            setProblems([]);
            return [];
        } finally {
            setLoading(false);
        }
    };

    // Add these functions after your existing state declarations and before the useEffect hooks

    const getSupabaseToken = async (): Promise<string> => {
        const auth = getAuth();
        const user = auth.currentUser;
        
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
        const auth = getAuth();
        const user = auth.currentUser;
        
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

            // Get existing bookmarks
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
                            if (typeof bookmarksText === 'string') {
                                const cleanedText = bookmarksText.replace(/[\[\]]/g, '');
                                if (cleanedText.trim()) {
                                    existingBookmarks = cleanedText.split(',').map(id => id.trim());
                                }
                            } else if (Array.isArray(bookmarksText)) {
                                existingBookmarks = bookmarksText;
                            }
                        } catch (parseError) {
                            console.warn('Error parsing existing bookmarks, starting fresh:', parseError);
                            existingBookmarks = [];
                        }
                    }
                }
            }

            // Merge bookmarks
            const combinedBookmarks = existingBookmarks.concat(bookmarkedProblemIds);
            const allBookmarks = Array.from(new Set(combinedBookmarks));
            const bookmarksText = `[${allBookmarks.join(', ')}]`;

            // Update or create record
            if (hasExistingRecord) {
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
            } else {
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
            }
        } catch (error) {
            console.error('Error saving bookmarks:', error);
            throw error;
        } finally {
            setSavingBookmarks(false);
        }
    };

const toggleBookmark = (problemId: string) => {
    setExamState(prev => {
        const newBookmarks = new Set(prev.bookmarkedProblems);
        const isAdding = !newBookmarks.has(problemId);
        
        if (isAdding) {
            newBookmarks.add(problemId);
        } else {
            newBookmarks.delete(problemId);
        }
        
        return {
            ...prev,
            bookmarkedProblems: newBookmarks
        };
    });
};

    const handleStartExam = async () => {
        const loadedProblems = await loadProblems();
        if (loadedProblems.length === 0) {
            alert('No problems found with the selected criteria. Please adjust your filters.');
        }
    };

    const handleDropdownSelect = (type: keyof typeof showDropdowns, value: string) => {
        setFilters(prev => ({ ...prev, [type]: value }));
        setShowDropdowns(prev => ({ ...prev, [type]: false }));
    };

    const toggleDropdown = (type: keyof typeof showDropdowns) => {
        setShowDropdowns(prev => ({ ...prev, [type]: !prev[type] }));
    };

    const handleBackToSetup = () => {
        setShowExam(false);
        setProblems([]);
        setExamState({
            userAnswers: {},
            isSubmitted: false,
            timeRemaining: 0,
            examStartTime: 0,
            showResults: false,
            bookmarkedProblems: new Set()
        });
        setCompletedReflections(new Set());
        setSolutionVisibility({});
        setSessionBookmarksSaved(false);
        savingBookmarksRef.current = false;
    };

    const handleAnswerChange = (problemId: string, answer: string) => {
        setExamState(prev => ({
            ...prev,
            userAnswers: {
                ...prev.userAnswers,
                [problemId]: answer
            }
        }));
    };

    const normalizeAnswer = (answer: string): string => {
        return answer
            .replace(/\$+/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .toUpperCase();
    };

    const isMultipleChoice = (problem: Problem): boolean => {
        const questionType = problem.question_type?.toLowerCase() || '';
        const answer = normalizeAnswer(problem.answer);
        return questionType.includes('multiple') || 
               questionType.includes('mcq') || 
               questionType.includes('choice') ||
               ['A', 'B', 'C', 'D', 'E'].includes(answer);
    };

    const handleTimeUp = () => {
        setExamState(prev => ({
            ...prev,
            isSubmitted: true,
            showResults: true
        }));
    };

    const handleSubmitExam = () => {
        setExamState(prev => ({
            ...prev,
            isSubmitted: true,
            showResults: true
        }));
        if (awardXP) {
        awardXP('MOCK_EXAM_COMPLETED', calculateStats().totalXP, 'Mock exam completed!');
    }

    const timeSpent = (filters.timeLimit * 60) - examState.timeRemaining;
    const avgTimePerProblem = Math.floor(timeSpent / problems.length);
    
    problems.forEach(problem => {
        const userAnswer = examState.userAnswers[problem.unique_problem_id] || '';
        const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(problem.answer);
        recordProblemAttempt(problem.unique_problem_id, problem, userAnswer, isCorrect, avgTimePerProblem);
    });

    // Save analytics
    if (problemManager) {
        try {
            problemManager.saveStats();
            console.log('Mock exam analytics saved successfully');
        } catch (error) {
            console.error('Failed to save mock exam analytics:', error);
        }
    }
    };

    const calculateStats = (): ExamStats => {
        let correctAnswers = 0;
        let totalXP = 0;
        
        const sourceBreakdown: Record<string, { correct: number; total: number }> = {};
        const difficultyBreakdown: Record<string, { correct: number; total: number }> = {};
        const topicBreakdown: Record<string, { correct: number; total: number }> = {};

        problems.forEach(problem => {
            const userAnswer = examState.userAnswers[problem.unique_problem_id] || '';
            const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(problem.answer);
            
            if (isCorrect) {
                correctAnswers++;
                const difficulty = parseInt(problem.difficulty) || 5;
                totalXP += difficulty * 3; // 3 XP per difficulty point for exams
            }

            // Source breakdown
            let sourceCategory = 'Other';
            if (problem.source?.toLowerCase().includes('amc 10')) sourceCategory = 'AMC 10';
            else if (problem.source?.toLowerCase().includes('amc 12')) sourceCategory = 'AMC 12';
            else if (problem.source?.toLowerCase().includes('aime')) sourceCategory = 'AIME';
            
            if (!sourceBreakdown[sourceCategory]) {
                sourceBreakdown[sourceCategory] = { correct: 0, total: 0 };
            }
            sourceBreakdown[sourceCategory].total++;
            if (isCorrect) sourceBreakdown[sourceCategory].correct++;

            // Difficulty breakdown
            if (!difficultyBreakdown[problem.difficulty]) {
                difficultyBreakdown[problem.difficulty] = { correct: 0, total: 0 };
            }
            difficultyBreakdown[problem.difficulty].total++;
            if (isCorrect) difficultyBreakdown[problem.difficulty].correct++;

            // Topic breakdown
            if (!topicBreakdown[problem.topic]) {
                topicBreakdown[problem.topic] = { correct: 0, total: 0 };
            }
            topicBreakdown[problem.topic].total++;
            if (isCorrect) topicBreakdown[problem.topic].correct++;
        });

        const timeSpent = (filters.timeLimit * 60) - examState.timeRemaining;

        return {
            totalQuestions: problems.length,
            correctAnswers,
            accuracy: problems.length > 0 ? (correctAnswers / problems.length) * 100 : 0,
            timeSpent,
            totalXP,
            sourceBreakdown,
            difficultyBreakdown,
            topicBreakdown
        };
    };

    const recordProblemAttempt = (problemId: string, problem: Problem, userAnswer: string, isCorrect: boolean, timeSpent: number) => {
    if (!problemManager) return;

    const attempt: ProblemAttempt = {
        problemId: problem.unique_problem_id,
        topic: problem.topic,
        difficulty: parseInt(problem.difficulty) || 5,
        source: problem.source || 'Unknown',
        isCorrect,
        timeSpent,
        answerGiven: userAnswer,
        xpEarned: isCorrect ? (parseInt(problem.difficulty) || 5) * 3 : 0,
        attemptedAt: new Date()
    };

    try {
        problemManager.recordAttempt(attempt);
        console.log(`Recorded ${isCorrect ? 'correct' : 'incorrect'} attempt for problem ${problemId}`);
    } catch (error) {
        console.error('Failed to record problem attempt:', error);
    }
};

    const formatTime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        
        if (hours > 0) {
            return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const getSourcePresets = (source: string) => {
        switch (source) {
            case 'AMC 10':
                return { problemCount: 25, timeLimit: 75 };
            case 'AMC 12':
                return { problemCount: 25, timeLimit: 75 };
            case 'AIME':
                return { problemCount: 15, timeLimit: 180 };
            default:
                return { problemCount: 20, timeLimit: 120 };
        }
    };

    // Auto-update problem count and time when source changes
    useEffect(() => {
        if (filters.source) {
            const presets = getSourcePresets(filters.source);
            setFilters(prev => ({
                ...prev,
                problemCount: presets.problemCount,
                timeLimit: presets.timeLimit
            }));
        }
    }, [filters.source]);

    // Clear topic and difficulty when selecting contest formats
    useEffect(() => {
        if (['AMC 10', 'AMC 12', 'AIME'].includes(filters.source)) {
            setFilters(prev => ({
                ...prev,
                topic: '',
                difficulty: ''
            }));
        }
    }, [filters.source]);

    // Handle error journal success
    const handleReflectionSuccess = (problemId: string) => {
        setCompletedReflections(prev => new Set(prev).add(problemId));
    };

    const toggleSolutionVisibility = (problemId: string) => {
    setSolutionVisibility(prev => ({
        ...prev,
        [problemId]: !prev[problemId]
    }));
};

    if (!isOpen) return null;

    // If being used as a page component (no onClose prop), render without modal wrapper
    const isPageMode = !onClose;
    
    const contentWrapper = (content: React.ReactNode) => {
        if (isPageMode) {
            return (
                <div className="min-h-screen bg-slate-900 p-6">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {content}
                    </div>
                </div>
            );
        } else {
            return (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <Card className="bg-gray-800 border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
                        {content}
                    </Card>
                </div>
            );
        }
    };

    // Results page - now rendered as a full page
    if (examState.showResults) {
        const stats = calculateStats();
        
        return (
            <div className="min-h-screen bg-slate-900 p-6">
                <div className="max-w-7xl mx-auto space-y-6">
                    <div className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700">
                       
                        <div className="flex items-center gap-3 text-white text-2xl font-bold">
                            
                            <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                <Trophy className="h-5 w-5 text-emerald-400" />
                            </div>
                            Mock Exam Complete!
                        </div>
                         <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/dashboard')}
                                className="text-gray-400 hover:text-white hover:bg-gray-700 mr-2"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        {onClose && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="text-gray-400 hover:text-white hover:bg-gray-700"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>

                    <div className="space-y-6">
                        {/* Overall Stats */}
                        <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-600/30">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-emerald-400">{stats.correctAnswers}/{stats.totalQuestions}</div>
                                        <div className="text-gray-400 text-sm">Correct</div>
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
                                        <div className="text-2xl font-bold text-purple-400">{formatTime(stats.timeSpent)}</div>
                                        <div className="text-gray-400 text-sm">Time Used</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-green-400">{formatTime(examState.timeRemaining)}</div>
                                        <div className="text-gray-400 text-sm">Time Left</div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Performance Breakdown */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Source Performance */}
                            <Card className="bg-gray-900/50 border-gray-700">
                                <CardHeader>
                                    <CardTitle className="text-white text-lg">Source Performance</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {Object.entries(stats.sourceBreakdown).map(([source, data]) => (
                                        <div key={source}>
                                            <div className="flex justify-between text-sm mb-1">
                                                <span className="text-gray-300">{source}</span>
                                                <span className="text-gray-400">{data.correct}/{data.total}</span>
                                            </div>
                                            <Progress value={data.total > 0 ? (data.correct / data.total) * 100 : 0} className="h-2" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>

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
                                            <Progress value={data.total > 0 ? (data.correct / data.total) * 100 : 0} className="h-2" />
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
                                            <Progress value={data.total > 0 ? (data.correct / data.total) * 100 : 0} className="h-2" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Detailed Review*/}
                        <Card className="bg-gray-900/50 border-gray-700">
                            <CardHeader>
                                <CardTitle className="text-white text-lg">Question Review</CardTitle>
                            </CardHeader>
                        </Card>

                        {/* Individual Problem Reviews - Now as separate cards with Error Journal Integration */}
                        <div className="space-y-6">
                            {problems.map((problem, index) => {
                                const userAnswer = examState.userAnswers[problem.unique_problem_id] || '';
                                const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(problem.answer);
                                const hasReflection = completedReflections.has(problem.unique_problem_id);
                                
                                return (
                                    <Card key={problem.unique_problem_id} className={`${
                                        isCorrect ? 'bg-green-600/10 border-green-600/30' : 'bg-red-600/10 border-red-600/30'
                                    }`}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg font-medium text-gray-300">Problem #{index + 1}</span>
                                                    {isCorrect ? (
                                                        <Check className="h-5 w-5 text-green-400" />
                                                    ) : (
                                                        <XCircle className="h-5 w-5 text-red-400" />
                                                    )}
                                                    <Badge className="text-xs">{problem.source}</Badge>
                                                    <Badge className="text-xs bg-blue-600/20 text-blue-400 border-blue-600/30">
                                                        {problem.topic}
                                                    </Badge>
                                                    <Badge className="text-xs bg-purple-600/20 text-purple-400 border-purple-600/30">
                                                        Level {problem.difficulty}
                                                    </Badge>
                                                    {hasReflection && (
                                                        <Badge className="text-xs bg-orange-600/20 text-orange-400 border-orange-600/30">
                                                            Reflected ✓
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                            
                                            {/* Problem Statement */}
                                            <div className="mb-4">
                                                <h4 className="text-sm font-medium text-gray-400 mb-2">Problem:</h4>
                                                <div className="text-gray-100 bg-gray-800/30 p-4 rounded-lg">
                                                    <MathRenderer content={problem.problem} />
                                                </div>
                                            </div>
                                            
                                            {/* Answer Comparison */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-400 mb-2">Your Answer:</h4>
                                                    <div className={`p-3 rounded-lg ${userAnswer ? "bg-gray-800/30" : "bg-gray-800/50"}`}>
                                                        {userAnswer ? (
                                                            <MathRenderer content={userAnswer} className="text-gray-300" />
                                                        ) : (
                                                            <span className="text-gray-500 italic">No answer provided</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-medium text-gray-400 mb-2">Correct Answer:</h4>
                                                    <div className="p-3 rounded-lg bg-green-600/10 border border-green-600/30">
                                                        <MathRenderer content={problem.answer} className="text-green-400" />
                                                    </div>
                                                </div>
                                            </div>

                                           {/* Solution with Toggle */}
                                            {problem.solution && problem.solution.trim() !== '' && (
                                                <div className="mb-4">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <h4 className="text-sm font-medium text-gray-400">Solution:</h4>
                                                        <Button
                                                            onClick={() => toggleSolutionVisibility(problem.unique_problem_id)}
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-blue-600/30 text-blue-400 hover:bg-blue-600/10"
                                                        >
                                                            {solutionVisibility[problem.unique_problem_id] ? 'Hide Solution' : 'Show Solution'}
                                                        </Button>
                                                    </div>
                                                    {solutionVisibility[problem.unique_problem_id] && (
                                                        <div className="text-gray-300 bg-blue-600/5 border border-blue-600/20 p-4 rounded-lg">
                                                            <MathRenderer content={problem.solution} />
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Error Journal Integration - Only show for incorrect answers */}
                                            {!isCorrect && (
                                                <ErrorJournalEntry
                                                    problemId={problem.unique_problem_id}
                                                    problemContent={problem.problem}
                                                    solutionContent={problem.solution}
                                                    userAnswer={userAnswer}
                                                    correctAnswer={problem.answer}
                                                    onSuccess={() => handleReflectionSuccess(problem.unique_problem_id)}
                                                />
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Reflection Progress Summary */}
                        {problems.some(p => {
                            const userAnswer = examState.userAnswers[p.unique_problem_id] || '';
                            const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(p.answer);
                            return !isCorrect;
                        }) && (
                            <Card className="bg-orange-600/10 border-orange-600/30">
                                <CardContent className="p-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <BookMarked className="h-5 w-5 text-orange-400" />
                                            <span className="font-medium text-orange-400">Error Journal Progress</span>
                                        </div>
                                        <div className="text-sm text-gray-300">
                                            {completedReflections.size} / {problems.filter(p => {
                                                const userAnswer = examState.userAnswers[p.unique_problem_id] || '';
                                                const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(p.answer);
                                                return !isCorrect;
                                            }).length} mistakes reflected upon
                                        </div>
                                    </div>
                                    <div className="mt-2">
                                        <Progress 
                                            value={problems.filter(p => {
                                                const userAnswer = examState.userAnswers[p.unique_problem_id] || '';
                                                const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(p.answer);
                                                return !isCorrect;
                                            }).length > 0 ? (completedReflections.size / problems.filter(p => {
                                                const userAnswer = examState.userAnswers[p.unique_problem_id] || '';
                                                const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(p.answer);
                                                return !isCorrect;
                                            }).length) * 100 : 100} 
                                            className="h-2" 
                                        />
                                    </div>
                                    <div className="text-xs text-gray-400 mt-2">
                                        Reflecting on your mistakes helps you learn and avoid similar errors in the future.
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <div className="flex gap-3 justify-center">
                            <Button
                                onClick={handleBackToSetup}
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Take Another Exam
                            </Button>
                            {onClose && (
                                <Button
                                    onClick={onClose}
                                    variant="outline"
                                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                >
                                    Close
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return contentWrapper(
        <div className={isPageMode ? "" : "bg-gray-800 border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-y-auto"}>
            <div className={`flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700 ${isPageMode ? "mb-6" : "p-6"}`}>
                <div className="flex items-center gap-3 text-white text-2xl font-bold">
                    <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
                        <BookOpen className="h-5 w-5 text-blue-400" />
                    </div>
                    {showExam ? 'Mock Exam in Progress' : 'Start Your Mock Exam!'}
                </div>
                <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => navigate('/dashboard')}
                                className="text-gray-400 hover:text-white hover:bg-gray-700 mr-2"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                </Button>
                {onClose && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className={`space-y-6 ${isPageMode ? "" : "p-6 pt-0"}`}>
                {!showExam ? (
                    <>
                        {/* Exam Setup */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Source Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Contest Source</label>
                                <div className="relative">
                                    <button
                                        onClick={() => toggleDropdown('source')}
                                        disabled={loadingFilters}
                                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-left hover:bg-gray-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                                    >
                                        <span>
                                            {loadingFilters ? 'Loading sources...' : (filters.source || 'All Sources')}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showDropdowns.source ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showDropdowns.source && !loadingFilters && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                            <button
                                                onClick={() => handleDropdownSelect('source', '')}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors text-gray-300 border-b border-gray-700"
                                            >
                                                All Sources
                                            </button>
                                            {filterOptions.sources.map((source) => (
                                                <button
                                                    key={source}
                                                    onClick={() => handleDropdownSelect('source', source)}
                                                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                                                        filters.source === source ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300'
                                                    }`}
                                                >
                                                    {source}
                                                    {source === 'AMC 10' && <span className="text-xs text-gray-400 ml-2">(25 problems, 75 min)</span>}
                                                    {source === 'AMC 12' && <span className="text-xs text-gray-400 ml-2">(25 problems, 75 min)</span>}
                                                    {source === 'AIME' && <span className="text-xs text-gray-400 ml-2">(15 problems, 180 min)</span>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Question Type Selection */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Question Type</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {['All', 'MCQ', 'Short Answer'].map((type) => (
                                        <button
                                            key={type}
                                            onClick={() => setFilters(prev => ({ ...prev, questionType: type }))}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                                                filters.questionType === type
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Additional Filters */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Topic Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Topic (Optional)</label>
                                <div className="relative">
                                    <button
                                        onClick={() => toggleDropdown('topic')}
                                        disabled={loadingFilters || ['AMC 10', 'AMC 12', 'AIME'].includes(filters.source)}
                                        className={`w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-left hover:bg-gray-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between ${
                                            ['AMC 10', 'AMC 12', 'AIME'].includes(filters.source) ? 'opacity-50 cursor-not-allowed' : ''
                                        }`}
                                    >
                                        <span>
                                            {loadingFilters ? 'Loading topics...' : 
                                             ['AMC 10', 'AMC 12', 'AIME'].includes(filters.source) ? 'Topic selection disabled for contest format' :
                                             (filters.topic || 'All Topics')}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showDropdowns.topic ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showDropdowns.topic && !loadingFilters && !['AMC 10', 'AMC 12', 'AIME'].includes(filters.source) && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                            <button
                                                onClick={() => handleDropdownSelect('topic', '')}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors text-gray-300 border-b border-gray-700"
                                            >
                                                All Topics
                                            </button>
                                            {filterOptions.topics.map((topic) => (
                                                <button
                                                    key={topic}
                                                    onClick={() => handleDropdownSelect('topic', topic)}
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
                                {['AMC 10', 'AMC 12', 'AIME'].includes(filters.source) && (
                                    <p className="text-xs text-amber-400">
                                        Topic filtering is disabled for official contest formats to maintain authenticity.
                                    </p>
                                )}
                            </div>

                            {/* Difficulty Filter */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Difficulty (Optional)</label>
                                <div className="relative">
                                    <button
                                        onClick={() => toggleDropdown('difficulty')}
                                        disabled={loadingFilters}
                                        className="w-full px-4 py-3 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-left hover:bg-gray-900/70 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
                                    >
                                        <span>
                                            {loadingFilters ? 'Loading difficulties...' : (filters.difficulty || 'All Difficulties')}
                                        </span>
                                        <ChevronDown className={`h-4 w-4 transition-transform ${showDropdowns.difficulty ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showDropdowns.difficulty && !loadingFilters && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                            <button
                                                onClick={() => handleDropdownSelect('difficulty', '')}
                                                className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors text-gray-300 border-b border-gray-700"
                                            >
                                                All Difficulties
                                            </button>
                                            {filterOptions.difficulties.map((difficulty) => (
                                                <button
                                                    key={difficulty}
                                                    onClick={() => handleDropdownSelect('difficulty', difficulty)}
                                                    className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors ${
                                                        filters.difficulty === difficulty ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300'
                                                    }`}
                                                >
                                                    Level {difficulty}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Exam Configuration */}
                        <div className="grid md:grid-cols-2 gap-6">
                            {/* Number of Problems */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Number of Problems</label>
                                <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={filters.problemCount}
                                    onChange={(e) => setFilters(prev => ({ 
                                        ...prev, 
                                        problemCount: Math.min(100, Math.max(1, Number(e.target.value))) 
                                    }))}
                                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="text-xs text-gray-400">
                                    Recommended: AMC (25), AIME (15), Custom (10-50)
                                </div>
                            </div>

                            {/* Time Limit */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-300">Time Limit (minutes)</label>
                                <input
                                    type="number"
                                    min="5"
                                    max="300"
                                    value={filters.timeLimit}
                                    onChange={(e) => setFilters(prev => ({ 
                                        ...prev, 
                                        timeLimit: Math.min(300, Math.max(5, Number(e.target.value))) 
                                    }))}
                                    className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <div className="text-xs text-gray-400">
                                    Recommended: AMC (75), AIME (180), Custom (60-120)
                                </div>
                            </div>
                        </div>


                        {/* Exam Summary */}
                        <Card className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-600/30">
                            <CardContent className="p-4">
                                <h4 className="text-sm font-medium text-blue-400 mb-3 flex items-center gap-2">
                                    <Target className="h-4 w-4" />
                                    Exam Configuration
                                </h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                    <div>
                                        <span className="text-gray-400">Source:</span>
                                        <div className="text-white font-medium">{filters.source || 'All Sources'}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Question Type:</span>
                                        <div className="text-white font-medium">{filters.questionType}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Problems:</span>
                                        <div className="text-white font-medium">{filters.problemCount}</div>
                                    </div>
                                    <div>
                                        <span className="text-gray-400">Time Limit:</span>
                                        <div className="text-white font-medium">{filters.timeLimit} min</div>
                                    </div>
                                </div>
                                {(filters.topic || filters.difficulty) && (
                                    <div className="mt-3 pt-3 border-t border-blue-600/20">
                                        <div className="flex flex-wrap gap-4 text-sm">
                                            {filters.topic && (
                                                <div>
                                                    <span className="text-gray-400">Topic:</span>
                                                    <span className="text-blue-400 font-medium ml-1">{filters.topic}</span>
                                                </div>
                                            )}
                                            {filters.difficulty && (
                                                <div>
                                                    <span className="text-gray-400">Difficulty:</span>
                                                    <span className="text-blue-400 font-medium ml-1">Level {filters.difficulty}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Database Connection Info */}
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-xs font-medium text-green-400">Database Connected</span>
                            </div>
                            <p className="text-xs text-gray-400">
                                Connected to Problems_DataBank • {filterOptions.sources.length} sources • {filterOptions.topics.length} topics • {filterOptions.difficulties.length} difficulty levels
                            </p>
                        </div>

                        {/* Start Exam Button */}
                        <Button
                            onClick={handleStartExam}
                            disabled={loading || loadingFilters}
                            className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white py-4 font-medium text-lg"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                    Loading Exam...
                                </>
                            ) : (
                                <>
                                    <Play className="h-5 w-5 mr-2" />
                                    Start Mock Exam
                                </>
                            )}
                        </Button>
                    </>
                ) : (
                    <>
                        {/* Exam Header */}
                        <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-600/30">
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div className="flex items-center space-x-4">
                                        <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                                            {filters.source || 'Mixed Sources'}
                                        </Badge>
                                        <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                                            {problems.length} Problems
                                        </Badge>
                                        <Badge className="bg-green-600/20 text-green-400 border-green-600/30">
                                            {filters.questionType}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center space-x-6">
                                        <div className="flex items-center space-x-2">
                                            <Clock className="h-4 w-4 text-gray-400" />
                                            <span className={`font-mono text-lg ${examState.timeRemaining < 300 ? "text-red-400 animate-pulse" : "text-gray-300"}`}>
                                                {formatTime(examState.timeRemaining)}
                                            </span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <span className="text-gray-400">Progress:</span>
                                            <span className="text-blue-400 font-semibold">
                                                {Object.keys(examState.userAnswers).length}/{problems.length}
                                            </span>
                                        </div>
                                        {examState.bookmarkedProblems.size > 0 && (
                                                <div className="flex items-center space-x-2">
                                                    <Bookmark className="h-4 w-4 text-orange-400" />
                                                    <span className="text-orange-400 font-semibold">
                                                        {examState.bookmarkedProblems.size} bookmarked
                                                    </span>
                                                </div>
                                            )}
                                    </div>
                                </div>
                                <div className="mt-3">
                                    <Progress 
                                        value={((filters.timeLimit * 60 - examState.timeRemaining) / (filters.timeLimit * 60)) * 100} 
                                        className="h-2"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Time Warning */}
                        {examState.timeRemaining < 300 && examState.timeRemaining > 0 && (
                            <Card className="bg-red-600/10 border-red-600/30">
                                <CardContent className="p-3">
                                    <div className="flex items-center gap-2 text-red-400">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-sm font-medium">Less than 5 minutes remaining!</span>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Problems List */}
                        <div className="space-y-6">
                            {problems.map((problem, index) => {
                                const userAnswer = examState.userAnswers[problem.unique_problem_id] || '';
                                const isMCQ = isMultipleChoice(problem);
                                
                                return (
                                    <Card key={problem.unique_problem_id} className="bg-gray-800 border-gray-700">
                                        <CardHeader>
                                            <div className="flex items-center justify-between">
                                                <CardTitle className="text-lg text-white">
                                                    Problem {index + 1}
                                                </CardTitle>
                                                <div className="flex items-center gap-2">
                                                    <Badge className="text-xs bg-gray-700 text-gray-300">
                                                        {problem.source}
                                                    </Badge>
                                                    <Badge className="text-xs bg-blue-600/20 text-blue-400 border-blue-600/30">
                                                        {problem.topic}
                                                    </Badge>
                                                    {userAnswer && (
                                                        <Check className="h-4 w-4 text-green-400" />
                                                    )}
                                                    <Button
                                                        onClick={() => toggleBookmark(problem.unique_problem_id)}
                                                        variant="ghost"
                                                        size="sm"
                                                        className={`ml-2 ${
                                                            examState.bookmarkedProblems.has(problem.unique_problem_id)
                                                                ? "text-orange-400 hover:text-orange-300"
                                                                : "text-gray-400 hover:text-orange-400"
                                                        }`}
                                                        disabled={examState.isSubmitted}
                                                    >
                                                        {examState.bookmarkedProblems.has(problem.unique_problem_id) ? (
                                                            <BookmarkCheck className="h-4 w-4" />
                                                        ) : (
                                                            <Bookmark className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="text-gray-100">
                                                <MathRenderer content={problem.problem} />
                                            </div>
                                            
                                            {/* Answer Input */}
                                            {isMCQ ? (
                                                <div className="grid gap-2">
                                                    {['A', 'B', 'C', 'D', 'E'].map((option) => (
                                                        <button
                                                            key={option}
                                                            onClick={() => handleAnswerChange(problem.unique_problem_id, option)}
                                                            disabled={examState.isSubmitted}
                                                            className={`p-3 text-left rounded-lg border transition-all ${
                                                                userAnswer === option
                                                                    ? "bg-blue-600/20 border-blue-600 text-blue-400"
                                                                    : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500"
                                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                                        >
                                                            <span className="font-semibold">({option})</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <input
                                                        type="text"
                                                        value={userAnswer}
                                                        onChange={(e) => handleAnswerChange(problem.unique_problem_id, e.target.value)}
                                                        disabled={examState.isSubmitted}
                                                        className="w-full px-4 py-3 bg-gray-800/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                                        placeholder="Enter your answer (you can use LaTeX like $x^2$ or $\frac{1}{2}$)"
                                                    />
                                                    {userAnswer && (
                                                        <div className="bg-gray-900/50 border border-gray-600 rounded-lg p-3">
                                                            <div className="text-xs text-gray-400 mb-1">Preview:</div>
                                                            <MathRenderer content={userAnswer} className="text-gray-300" />
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>

                        {/* Submit Button */}
                        <Card className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 border-green-600/30 sticky bottom-4">
                            <CardContent className="p-4">
                                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                    <div className="text-center sm:text-left">
                                        <div className="text-white font-medium">Ready to Submit?</div>
                                        <div className="text-gray-400 text-sm">
                                            {Object.keys(examState.userAnswers).length}/{problems.length} questions answered
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={handleBackToSetup}
                                            variant="outline"
                                            className="border-gray-600 text-gray-300 hover:bg-gray-700"
                                        >
                                            Cancel Exam
                                        </Button>
                                        <Button
                                            onClick={handleSubmitExam}
                                            className="bg-green-600 hover:bg-green-700 text-white px-8"
                                            disabled={examState.isSubmitted}
                                        >
                                            <Trophy className="h-4 w-4 mr-2" />
                                            Submit Exam
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}