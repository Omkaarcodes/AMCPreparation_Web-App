import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
    Search, 
    Filter, 
    Bookmark, 
    BookmarkX, 
    Eye, 
    EyeOff, 
    Download, 
    Play, 
    Trash2,
    Plus,
    X,
    ChevronDown,
    Tag,
    FileText,
    Settings,
    BookOpen,
    Target,
    Zap,
    Clock,
    TrendingUp,
    FolderOpen,
    Folder,
    Edit,
    Archive,
    ArrowLeft,
    Timer,
    Trophy,
    BarChart3,
    Shuffle,
    Brain,
    Calendar,
    Star,
    Award,
    Activity,
    CheckCircle2,
    XCircle,
    Home,
    RotateCcw,
    PlayCircle,
    PauseCircle,
    SkipForward,
    Flag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { supabase } from './supabase-client';
import { useNavigate } from 'react-router-dom';
import { User, getAuth, onAuthStateChanged } from 'firebase/auth';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

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

interface Collection {
    id: string;
    name: string;
    color: string;
    created_at: string;
    problem_count: number;
    problem_ids: string[]; 
}

interface BookmarkFilters {
    searchTerm: string;
    selectedTopics: string[];
    selectedDifficulties: string[];
    selectedCollections: string[];
    showUncategorized: boolean;
}

interface PracticeSession {
    id: string;
    problems: Problem[];
    currentIndex: number;
    startTime: Date;
    timeLimit?: number;
    mode: 'untimed' | 'timed' | 'sprint';
    answers: { [key: string]: string };
    completed: boolean;
}

const MathRenderer: React.FC<{ content: string; className?: string }> = ({ content, className = "" }) => {
    const renderMathContent = (text: string) => {
        if (!text) return null;
        const mathRegex = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|\$[^$\n]*?\$)/g;
        
        const parts = text.split(mathRegex);
        
        return parts.map((part, index) => {
            if (part.startsWith('$$') && part.endsWith('$$')) {
                const latex = part.slice(2, -2).trim();
                try {
                    return <BlockMath key={index} math={latex} />;
                } catch (error) {
                    console.error('LaTeX parsing error ($$):', error);
                    return <span key={index} className="text-red-400 bg-red-900/20 px-2 py-1 rounded">LaTeX Error: {part}</span>;
                }
            } else if (part.startsWith('\\[') && part.endsWith('\\]')) {
                const latex = part.slice(2, -2).trim();
                try {
                    return <BlockMath key={index} math={latex} />;
                } catch (error) {
                    console.error('LaTeX parsing error (\\[\\]):', error);
                    return <span key={index} className="text-red-400 bg-red-900/20 px-2 py-1 rounded">LaTeX Error: {part}</span>;
                }
            } else if (part.startsWith('\\(') && part.endsWith('\\)')) {
                const latex = part.slice(2, -2).trim();
                try {
                    return <InlineMath key={index} math={latex} />;
                } catch (error) {
                    console.error('LaTeX parsing error (\\(\\)):', error);
                    return <span key={index} className="text-red-400 bg-red-900/20 px-1 rounded">LaTeX Error: {part}</span>;
                }
            } else if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
                const latex = part.slice(1, -1).trim();
                try {
                    return <InlineMath key={index} math={latex} />;
                } catch (error) {
                    console.error('LaTeX parsing error ($):', error);
                    return <span key={index} className="text-red-400 bg-red-900/20 px-1 rounded">LaTeX Error: {part}</span>;
                }
            } else {
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

export default function BookmarkedProblemsViewer() {
    const [user, setUser] = useState<User | null>(null);
    const [mounted, setMounted] = useState(false);
    const [bookmarkedProblems, setBookmarkedProblems] = useState<Problem[]>([]);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [loading, setLoading] = useState(true);
    const [removing, setRemoving] = useState<string | null>(null);
    const [expandedSolutions, setExpandedSolutions] = useState<Set<string>>(new Set());
    const [selectedProblems, setSelectedProblems] = useState<Set<string>>(new Set());
    const [showCreateCollection, setShowCreateCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [newCollectionColor, setNewCollectionColor] = useState('#3b82f6');
    const [showFilters, setShowFilters] = useState(false);
    const [showCollections, setShowCollections] = useState(false);
    const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
    const [viewMode, setViewMode] = useState<'all' | 'collection' | 'practice'>('all');
    const [deletingCollection, setDeletingCollection] = useState<string | null>(null);
    
    // New practice mode states
    const [practiceSession, setPracticeSession] = useState<PracticeSession | null>(null);
    const [practiceMode, setPracticeMode] = useState<'untimed' | 'timed' | 'sprint'>('untimed');
    const [timeRemaining, setTimeRemaining] = useState<number>(0);
    const [isPaused, setIsPaused] = useState(false);
    const [showPracticeSetup, setShowPracticeSetup] = useState(false);
    const [practiceCount, setPracticeCount] = useState(10);
    const [practiceTimeLimit, setPracticeTimeLimit] = useState(75); // minutes
    const [showAddToCollection, setShowAddToCollection] = useState(false);
    const [selectedCollectionForAdd, setSelectedCollectionForAdd] = useState<Collection | null>(null);
    const [addingToCollection, setAddingToCollection] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    
  
    const [showAnalytics, setShowAnalytics] = useState(false);
    
    const [filters, setFilters] = useState<BookmarkFilters>({
        searchTerm: '',
        selectedTopics: [],
        selectedDifficulties: [],
        selectedCollections: [],
        showUncategorized: false
    });

    const [availableTopics, setAvailableTopics] = useState<string[]>([]);
    const [availableDifficulties, setAvailableDifficulties] = useState<string[]>([]);

    const auth = getAuth();
    const navigate = useNavigate();
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const globalStyles = `
        * {
          font-family: 'Noto Serif JP', serif !important;
        }
      `;

    const handlePracticeAnswerChange = useCallback((problemId: string, value: string) => {
    setPracticeSession(prev => {
        if (!prev) return null;
        return {
            ...prev,
            answers: {
                ...prev.answers,
                [problemId]: value
            }
        };
    });
}, []);

    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.textContent = globalStyles;
        document.head.appendChild(styleElement);
        
        return () => {
          document.head.removeChild(styleElement);
        };
    }, []);

    // Timer effect for practice sessions
    useEffect(() => {
        if (practiceSession && practiceSession.mode === 'timed' && timeRemaining > 0 && !isPaused) {
            timerRef.current = setTimeout(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        completePracticeSession();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
        };
    }, [practiceSession, timeRemaining, isPaused]);

    // Supabase authentication token helper
    const getSupabaseToken = async (): Promise<string> => {
        if (!user) {
            throw new Error('No Firebase user signed in');
        }

        const idToken = await user.getIdToken(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        
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
        return data.access_token;
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            if (!currentUser) {
                navigate('/login');
            }
        });
        return () => unsubscribe();
    }, [auth, navigate]);

    useEffect(() => {
        setMounted(true);
        if (user) {
            loadBookmarkedProblems();
            loadCollections();
        }
    }, [user]);

    useEffect(() => {
    // Auto-focus the input when problem changes, but don't force remount
    if (inputRef.current && !practiceSession?.completed) {
        inputRef.current.focus();
    }
        }, [practiceSession?.currentIndex]);


    const addToExistingCollection = async (collectionId: string) => {
    if (!user || selectedProblems.size === 0) return;

    setAddingToCollection(true);
    
    try {
        const token = await getSupabaseToken();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        const problemIdsArray = Array.from(selectedProblems);

        // Get current collections
        const response = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey,
                'Content-Type': 'application/json'
            }
        });

        let currentCollections: Collection[] = [];
        if (response.ok) {
            const userData = await response.json();
            if (userData && userData.length > 0 && userData[0].problem_collections) {
                currentCollections = userData[0].problem_collections;
            }
        }

        // Update the specific collection
        const updatedCollections = currentCollections.map(collection => {
            if (collection.id === collectionId) {
                const existingIds = collection.problem_ids || [];
                const newIds = problemIdsArray.filter(id => !existingIds.includes(id));
                const mergedIds = [...existingIds, ...newIds];
                
                return {
                    ...collection,
                    problem_ids: mergedIds,
                    problem_count: mergedIds.length
                };
            }
            return collection;
        });

        // Update database
        const updateResponse = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                problem_collections: updatedCollections
            })
        });

        if (updateResponse.ok) {
            setCollections(updatedCollections);
            setSelectedProblems(new Set());
            setShowAddToCollection(false);
            setSelectedCollectionForAdd(null);
        }

    } catch (error) {
        console.error('Error adding to collection:', error);
    } finally {
        setAddingToCollection(false);
    }
};

    const startPracticeSession = (problems: Problem[], mode: 'untimed' | 'timed' | 'sprint') => {
        const shuffledProblems = [...problems].sort(() => Math.random() - 0.5);
        const selectedProblems = shuffledProblems.slice(0, practiceCount);
        
        const session: PracticeSession = {
            id: `session_${Date.now()}`,
            problems: selectedProblems,
            currentIndex: 0,
            startTime: new Date(),
            mode,
            timeLimit: mode === 'timed' ? practiceTimeLimit : undefined,
            answers: {},
            completed: false
        };

        setPracticeSession(session);
        setViewMode('practice');
        
        if (mode === 'timed') {
            setTimeRemaining(practiceTimeLimit * 60); // Convert to seconds
        } else if (mode === 'sprint') {
            setTimeRemaining(5 * 60); // 5 minutes for sprint mode
        }
        
        setShowPracticeSetup(false);
    };

    const completePracticeSession = () => {
        if (!practiceSession) return;
        
        const updatedSession = { ...practiceSession, completed: true };
        setPracticeSession(updatedSession);
        
       
    };

    const exitPracticeSession = () => {
        setPracticeSession(null);
        setViewMode('all');
        setTimeRemaining(0);
        setIsPaused(false);
    };

    const loadBookmarkedProblems = async () => {
        if (!user) return;

        setLoading(true);
        try {
            const token = await getSupabaseToken();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            // Get user's bookmarked problem IDs
            const userDataResponse = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!userDataResponse.ok) {
                console.log('No bookmarked problems found');
                setBookmarkedProblems([]);
                return;
            }

            const userData = await userDataResponse.json();
            if (!userData || userData.length === 0) {
                setBookmarkedProblems([]);
                return;
            }

            const bookmarksText = userData[0].problems_bookmarked;
            if (!bookmarksText) {
                setBookmarkedProblems([]);
                return;
            }

            // Parse bookmarked problem IDs
            let bookmarkedIds: string[] = [];
            try {
                if (typeof bookmarksText === 'string') {
                    const cleanedText = bookmarksText.replace(/[\[\]]/g, '');
                    if (cleanedText.trim()) {
                        bookmarkedIds = cleanedText.split(',').map(id => id.trim());
                    }
                } else if (Array.isArray(bookmarksText)) {
                    bookmarkedIds = bookmarksText;
                }
            } catch (parseError) {
                console.error('Error parsing bookmarked problems:', parseError);
                setBookmarkedProblems([]);
                return;
            }

            if (bookmarkedIds.length === 0) {
                setBookmarkedProblems([]);
                return;
            }

            // Fetch the actual problems
            const { data: problems, error } = await supabase
                .from('Problems_DataBank')
                .select('*')
                .in('unique_problem_id', bookmarkedIds);

            if (error) {
                console.error('Error fetching bookmarked problems:', error);
                setBookmarkedProblems([]);
                return;
            }

            setBookmarkedProblems(problems || []);

            // Extract unique topics and difficulties for filters
            const topics = Array.from(new Set(problems?.map(p => p.topic).filter(Boolean) || [])).sort();
            const difficulties = Array.from(new Set(problems?.map(p => p.difficulty).filter(Boolean) || [])).sort((a, b) => {
                const numA = parseInt(a);
                const numB = parseInt(b);
                if (!isNaN(numA) && !isNaN(numB)) {
                    return numA - numB;
                }
                return a.localeCompare(b);
            });

            setAvailableTopics(topics);
            setAvailableDifficulties(difficulties);

        } catch (error) {
            console.error('Error loading bookmarked problems:', error);
            setBookmarkedProblems([]);
        } finally {
            setLoading(false);
        }
    };

    const loadCollections = async () => {
        if (!user) return;

        try {
            const token = await getSupabaseToken();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            const response = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const userData = await response.json();
                if (userData && userData.length > 0 && userData[0].problem_collections) {
                    const collectionsData = userData[0].problem_collections;
                    if (Array.isArray(collectionsData)) {
                        setCollections(collectionsData);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading collections:', error);
        }
    };

    const removeBookmark = async (problemId: string) => {
        if (!user) return;

        setRemoving(problemId);
        try {
            const token = await getSupabaseToken();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            // Get current bookmarks
            const response = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) return;

            const userData = await response.json();
            if (!userData || userData.length === 0) return;

            const bookmarksText = userData[0].problems_bookmarked;
            let bookmarkedIds: string[] = [];

            if (typeof bookmarksText === 'string') {
                const cleanedText = bookmarksText.replace(/[\[\]]/g, '');
                if (cleanedText.trim()) {
                    bookmarkedIds = cleanedText.split(',').map(id => id.trim());
                }
            } else if (Array.isArray(bookmarksText)) {
                bookmarkedIds = bookmarksText;
            }

            // Remove the problem ID
            const updatedBookmarks = bookmarkedIds.filter(id => id !== problemId);
            const updatedBookmarksText = `[${updatedBookmarks.join(', ')}]`;

            // Also remove from collections
            let currentCollections = userData[0].problem_collections || [];
            const updatedCollections = currentCollections.map((collection: Collection) => ({
                ...collection,
                problem_ids: collection.problem_ids ? collection.problem_ids.filter(id => id !== problemId) : [],
                problem_count: collection.problem_ids ? collection.problem_ids.filter(id => id !== problemId).length : 0
            }));

            // Update database
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    problems_bookmarked: updatedBookmarksText,
                    problem_collections: updatedCollections
                })
            });

            if (updateResponse.ok) {
                // Update local state
                setBookmarkedProblems(prev => prev.filter(p => p.unique_problem_id !== problemId));
                setCollections(updatedCollections);
                setSelectedProblems(prev => {
                    const newSet = new Set(prev);
                    newSet.delete(problemId);
                    return newSet;
                });
            }

        } catch (error) {
            console.error('Error removing bookmark:', error);
        } finally {
            setRemoving(null);
        }
    };

    const createCollection = async () => {
        if (!user || !newCollectionName.trim() || selectedProblems.size === 0) return;

        try {
            const token = await getSupabaseToken();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            const problemIdsArray = Array.from(selectedProblems);
            const newCollection: Collection = {
                id: `col_${Date.now()}`,
                name: newCollectionName.trim(),
                color: newCollectionColor,
                created_at: new Date().toISOString(),
                problem_count: problemIdsArray.length,
                problem_ids: problemIdsArray // Store actual problem IDs
            };

            // Get current collections
            const response = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json'
                }
            });

            let currentCollections: Collection[] = [];
            if (response.ok) {
                const userData = await response.json();
                if (userData && userData.length > 0 && userData[0].problem_collections) {
                    currentCollections = Array.isArray(userData[0].problem_collections) ? userData[0].problem_collections : [];
                }
            }

            const updatedCollections = [...currentCollections, newCollection];

            // Update database
            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    problem_collections: updatedCollections
                })
            });

            if (updateResponse.ok) {
                setCollections(updatedCollections);
                setNewCollectionName('');
                setNewCollectionColor('#3b82f6');
                setSelectedProblems(new Set());
                setShowCreateCollection(false);
            }

        } catch (error) {
            console.error('Error creating collection:', error);
        }
    };

    const deleteCollection = async (collectionId: string) => {
        if (!user) return;

        setDeletingCollection(collectionId);
        try {
            const token = await getSupabaseToken();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            const updatedCollections = collections.filter(c => c.id !== collectionId);

            const updateResponse = await fetch(`${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user.uid}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    problem_collections: updatedCollections
                })
            });

            if (updateResponse.ok) {
                setCollections(updatedCollections);
                if (selectedCollection?.id === collectionId) {
                    setSelectedCollection(null);
                    setViewMode('all');
                }
            }

        } catch (error) {
            console.error('Error deleting collection:', error);
        } finally {
            setDeletingCollection(null);
        }
    };

    const viewCollection = (collection: Collection) => {
        setSelectedCollection(collection);
        setViewMode('collection');
        setShowCollections(false); // Close collections panel when viewing a specific collection
    };

    const backToAllProblems = () => {
        setViewMode('all');
        setSelectedCollection(null);
    };

    const getProblemsInCollection = (collection: Collection): Problem[] => {
        if (!collection.problem_ids) return [];
        return bookmarkedProblems.filter(problem => 
            collection.problem_ids.includes(problem.unique_problem_id)
        );
    };

    const getUncategorizedProblems = (): Problem[] => {
        const categorizedIds = new Set();
        collections.forEach(collection => {
            if (collection.problem_ids) {
                collection.problem_ids.forEach(id => categorizedIds.add(id));
            }
        });
        return bookmarkedProblems.filter(problem => 
            !categorizedIds.has(problem.unique_problem_id)
        );
    };

    const toggleSolution = (problemId: string) => {
        setExpandedSolutions(prev => {
            const newSet = new Set(prev);
            if (newSet.has(problemId)) {
                newSet.delete(problemId);
            } else {
                newSet.add(problemId);
            }
            return newSet;
        });
    };

    const toggleProblemSelection = (problemId: string) => {
        setSelectedProblems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(problemId)) {
                newSet.delete(problemId);
            } else {
                newSet.add(problemId);
            }
            return newSet;
        });
    };

    const exportProblems = (format: 'text' | 'pdf') => {
        const filteredProblems = getFilteredProblems();
        
        if (format === 'text') {
            const content = filteredProblems.map((problem, index) => `
Problem ${index + 1}:
Topic: ${problem.topic}
Difficulty: ${problem.difficulty}
Source: ${problem.source}

Question:
${problem.problem}

Answer:
${problem.answer}

Solution:
${problem.solution}

${'='.repeat(80)}
            `).join('\n');

            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `bookmarked-problems-${new Date().toISOString().split('T')[0]}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }
    };

    const getFilteredProblems = () => {
        let problemsToFilter = bookmarkedProblems;

        // If viewing a specific collection, filter by that collection
        if (viewMode === 'collection' && selectedCollection) {
            problemsToFilter = getProblemsInCollection(selectedCollection);
        }

        return problemsToFilter.filter(problem => {
            // Search term filter
            if (filters.searchTerm) {
                const searchLower = filters.searchTerm.toLowerCase();
                const matchesSearch = 
                    problem.problem.toLowerCase().includes(searchLower) ||
                    problem.topic.toLowerCase().includes(searchLower) ||
                    problem.source.toLowerCase().includes(searchLower) ||
                    problem.solution.toLowerCase().includes(searchLower);
                if (!matchesSearch) return false;
            }

            // Topic filter
            if (filters.selectedTopics.length > 0 && !filters.selectedTopics.includes(problem.topic)) {
                return false;
            }

            // Difficulty filter
            if (filters.selectedDifficulties.length > 0 && !filters.selectedDifficulties.includes(problem.difficulty)) {
                return false;
            }

            return true;
        });
    };

    const getDifficultyColor = (difficulty: string) => {
        const diff = parseInt(difficulty) || 5;
        if (diff <= 3) return "bg-green-600/20 text-green-400 border-green-600/30";
        if (diff <= 7) return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30";
        return "bg-red-600/20 text-red-400 border-red-600/30";
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };


    const filteredProblems = getFilteredProblems();

    // Practice Mode Component
    const PracticeMode = () => {
    if (!practiceSession) return null;

    const currentProblem = practiceSession.problems[practiceSession.currentIndex];
    const progress = ((practiceSession.currentIndex + 1) / practiceSession.problems.length) * 100;

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Practice Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={exitPracticeSession}
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Exit Practice
                        </Button>
                        <div className="text-white">
                            <h1 className="text-xl font-bold">Practice Session</h1>
                            <p className="text-sm text-slate-400">
                                Problem {practiceSession.currentIndex + 1} of {practiceSession.problems.length}
                            </p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {practiceSession.mode === 'timed' && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-800 rounded-lg border border-slate-600">
                                <Timer className="h-4 w-4 text-blue-400" />
                                <span className="text-white font-mono">
                                    {formatTime(timeRemaining)}
                                </span>
                                <Button
                                    onClick={() => setIsPaused(!isPaused)}
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-white p-1"
                                >
                                    {isPaused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                        
                        <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">
                            {practiceSession.mode.toUpperCase()}
                        </Badge>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-800 rounded-full h-2">
                    <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    />
                </div>

                {/* Problem Card */}
                <Card className="bg-slate-800/50 border-slate-700">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Badge className={getDifficultyColor(currentProblem.difficulty)}>
                                    Level {currentProblem.difficulty}
                                </Badge>
                                <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                                    {currentProblem.topic}
                                </Badge>
                                <Badge variant="outline" className="border-slate-600 text-slate-400">
                                    {currentProblem.source}
                                </Badge>
                            </div>
                            
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-400 hover:text-yellow-400"
                            >
                                <Flag className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                        <div className="text-white text-lg">
                            <MathRenderer content={currentProblem.problem} />
                        </div>
                        
                        {/* Answer Input*/}
                       
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-slate-300">Your Answer:</label>
                            <input
                                type="text"
                                value={practiceSession.answers[currentProblem.unique_problem_id] || ''}
                                onChange={(e) => handlePracticeAnswerChange(currentProblem.unique_problem_id, e.target.value)}
                                className="w-full px-4 py-3 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Enter your answer..."
                                disabled={practiceSession.completed}
                                autoComplete="off"
                                autoFocus={true}
                            />
                        </div>
                        
                        {/* Navigation Buttons */}
                        <div className="flex items-center justify-between pt-4">
                            <Button
                                onClick={() => {
                                    if (practiceSession.currentIndex > 0) {
                                        setPracticeSession(prev => prev ? {
                                            ...prev,
                                            currentIndex: prev.currentIndex - 1
                                        } : null);
                                    }
                                }}
                                disabled={practiceSession.currentIndex === 0}
                                variant="outline"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Previous
                            </Button>
                            
                            <div className="flex gap-2">
                                {practiceSession.currentIndex < practiceSession.problems.length - 1 ? (
                                    <Button
                                        onClick={() => {
                                            setPracticeSession(prev => prev ? {
                                                ...prev,
                                                currentIndex: prev.currentIndex + 1
                                            } : null);
                                        }}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                    >
                                        Next
                                        <SkipForward className="h-4 w-4 ml-2" />
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={completePracticeSession}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <CheckCircle2 className="h-4 w-4 mr-2" />
                                        Complete Practice
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Show solution if practice is completed */}
                        {practiceSession.completed && (
                            <div className="border-t border-slate-700 pt-4 space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-green-400 mb-2">Correct Answer:</h4>
                                    <div className="text-white bg-slate-900/50 p-3 rounded-lg">
                                        <MathRenderer content={currentProblem.answer} />
                                    </div>
                                </div>
                                
                                {currentProblem.solution && (
                                    <div>
                                        <h4 className="text-sm font-semibold text-blue-400 mb-2">Solution:</h4>
                                        <div className="text-slate-300 bg-slate-900/50 p-3 rounded-lg">
                                            <MathRenderer content={currentProblem.solution} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}


    if (viewMode === 'practice') {
        return <PracticeMode />;
    }


    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-center py-12">
                        <div className="text-center space-y-4">
                            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-700 border-t-blue-500 mx-auto"></div>
                            <p className="text-slate-300">Loading your bookmarked problems...</p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Button
                            onClick={() => navigate('/dashboard')}
                            variant="outline"
                            size="sm"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            <Home className="h-4 w-4 mr-2" />
                            
                        </Button>
                        
                        <div>
                            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                <div className="p-2 bg-orange-500/10 rounded-lg border border-orange-500/20">
                                    <Bookmark className="h-6 w-6 text-orange-400" />
                                </div>
                                {viewMode === 'collection' && selectedCollection 
                                    ? `Collection: ${selectedCollection.name}`
                                    : 'Bookmarked Problems'
                                }
                            </h1>
                            <div className="flex items-center gap-4 mt-2">
                                <p className="text-slate-400">
                                    {viewMode === 'collection' && selectedCollection
                                        ? `${selectedCollection.problem_count} problems in collection • ${filteredProblems.length} shown`
                                        : `${bookmarkedProblems.length} problems saved • ${filteredProblems.length} shown`
                                    }
                                </p>
                                {viewMode === 'collection' && (
                                    <Button
                                        onClick={backToAllProblems}
                                        variant="ghost"
                                        size="sm"
                                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
                                    >
                                        <ArrowLeft className="h-4 w-4 mr-1" />
                                        Back to All Problems
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {viewMode === 'collection' && selectedCollection && (
                        <Button
                            onClick={() => setShowPracticeSetup(true)}
                            className="bg-green-600 hover:bg-green-700 text-white"
                            disabled={getProblemsInCollection(selectedCollection).length === 0}
                        >
                            <Brain className="h-4 w-4 mr-2" />
                            Practice Collection
                        </Button>
                        )}

                        <Button
                            onClick={() => setShowCollections(!showCollections)}
                            variant={showCollections ? 'default' : 'outline'}
                            className={showCollections 
                                ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                : "border-slate-600 text-slate-300 hover:bg-slate-700"
                            }
                        >
                            <FolderOpen className="h-4 w-4 mr-2" />
                            Collections ({collections.length})
                        </Button>
                        
                        <Button
                            onClick={() => setShowFilters(!showFilters)}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                        </Button>
                        
                        {selectedProblems.size > 0 && (
                            <Button
                                onClick={() => setShowCreateCollection(true)}
                                className="bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Collection ({selectedProblems.size})
                            </Button>
                        )}
                        
                        <Button
                            onClick={() => exportProblems('text')}
                            variant="outline"
                            className="border-slate-600 text-slate-300 hover:bg-slate-700"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Export
                        </Button>
                    </div>
                </div>

                {/* Collections Panel */}
                {showCollections && (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Folder className="h-5 w-5" />
                                Your Collections
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {collections.length === 0 ? (
                                <div className="text-center py-8">
                                    <Folder className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                                    <p className="text-slate-400">No collections yet. Select problems and create your first collection!</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {collections.map((collection) => (
                                        <Card key={collection.id} className="bg-slate-900/50 border-slate-600 hover:bg-slate-900/70 transition-colors">
                                            <CardContent className="p-4">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-4 h-4 rounded-full" 
                                                            style={{ backgroundColor: collection.color }}
                                                        />
                                                        <h3 className="font-semibold text-white">{collection.name}</h3>
                                                    </div>
                                                    <Button
                                                        onClick={() => deleteCollection(collection.id)}
                                                        disabled={deletingCollection === collection.id}
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-slate-400 hover:text-red-400 p-1"
                                                    >
                                                        {deletingCollection === collection.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-red-400"></div>
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                </div>
                                                <p className="text-sm text-slate-400 mb-3">
                                                    {collection.problem_count} problems
                                                </p>
                                                <div className="flex gap-2">
                                                    <Button
                                                        onClick={() => viewCollection(collection)}
                                                        size="sm"
                                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                                    >
                                                        View Collection
                                                    </Button>
                                                    <Button
                                                        onClick={() => {
                                                            setSelectedCollection(collection);
                                                            setShowPracticeSetup(true);
                                                        }}
                                                        size="sm"
                                                        className="bg-green-600 hover:bg-green-700 text-white"
                                                    >
                                                        <Play className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Statistics Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">Total Bookmarks</p>
                                    <p className="text-2xl font-bold text-white">{bookmarkedProblems.length}</p>
                                </div>
                                <BookOpen className="h-8 w-8 text-blue-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">Collections</p>
                                    <p className="text-2xl font-bold text-white">{collections.length}</p>
                                </div>
                                <Tag className="h-8 w-8 text-purple-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">Topics Covered</p>
                                    <p className="text-2xl font-bold text-white">{availableTopics.length}</p>
                                </div>
                                <Target className="h-8 w-8 text-green-400" />
                            </div>
                        </CardContent>
                    </Card>
                    
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-400">Uncategorized</p>
                                    <p className="text-2xl font-bold text-white">{getUncategorizedProblems().length}</p>
                                </div>
                                <Archive className="h-8 w-8 text-yellow-400" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filters Panel */}
                {showFilters && (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardHeader>
                            <CardTitle className="text-white flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filter & Search
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                                <input
                                    type="text"
                                    placeholder="Search problems, topics, or solutions..."
                                    value={filters.searchTerm}
                                    onChange={(e) => setFilters(prev => ({ ...prev, searchTerm: e.target.value }))}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Topic Filter */}
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Topics</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableTopics.map(topic => (
                                        <button
                                            key={topic}
                                            onClick={() => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    selectedTopics: prev.selectedTopics.includes(topic)
                                                        ? prev.selectedTopics.filter(t => t !== topic)
                                                        : [...prev.selectedTopics, topic]
                                                }));
                                            }}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                filters.selectedTopics.includes(topic)
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                        >
                                            {topic}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Difficulty Filter */}
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Difficulty Levels</label>
                                <div className="flex flex-wrap gap-2">
                                    {availableDifficulties.map(difficulty => (
                                        <button
                                            key={difficulty}
                                            onClick={() => {
                                                setFilters(prev => ({
                                                    ...prev,
                                                    selectedDifficulties: prev.selectedDifficulties.includes(difficulty)
                                                        ? prev.selectedDifficulties.filter(d => d !== difficulty)
                                                        : [...prev.selectedDifficulties, difficulty]
                                                }));
                                            }}
                                            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                                filters.selectedDifficulties.includes(difficulty)
                                                    ? 'bg-yellow-500 text-white'
                                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                        >
                                            Level {difficulty}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Clear Filters */}
                            <Button
                                onClick={() => setFilters({
                                    searchTerm: '',
                                    selectedTopics: [],
                                    selectedDifficulties: [],
                                    selectedCollections: [],
                                    showUncategorized: false
                                })}
                                variant="outline"
                                size="sm"
                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                            >
                                Clear All Filters
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {/* Practice Setup Modal */}
                {showPracticeSetup && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Brain className="h-5 w-5" />
                                    Start Practice Session
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">Practice Mode</label>
                                    <div className="space-y-2">
                                        <button
                                            onClick={() => setPracticeMode('untimed')}
                                            className={`w-full p-3 rounded-lg border text-left transition-colors ${
                                                practiceMode === 'untimed'
                                                    ? 'border-green-500 bg-green-500/10 text-green-400'
                                                    : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            <div className="font-medium">Untimed Practice</div>
                                            <div className="text-sm opacity-75">Take your time to understand each problem</div>
                                        </button>
                                        <button
                                            onClick={() => setPracticeMode('timed')}
                                            className={`w-full p-3 rounded-lg border text-left transition-colors ${
                                                practiceMode === 'timed'
                                                    ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                                    : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            <div className="font-medium">Timed Practice</div>
                                            <div className="text-sm opacity-75">Simulate real test conditions</div>
                                        </button>
                                        {/* <button
                                            onClick={() => setPracticeMode('sprint')}
                                            className={`w-full p-3 rounded-lg border text-left transition-colors ${
                                                practiceMode === 'sprint'
                                                    ? 'border-purple-500 bg-purple-500/10 text-purple-400'
                                                    : 'border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700'
                                            }`}
                                        >
                                            <div className="font-medium">Sprint Mode</div>
                                            <div className="text-sm opacity-75">Quick 5-minute intense session</div>
                                        </button> */}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">
                                        Number of Problems
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedCollection ? getProblemsInCollection(selectedCollection).length : 0}
                                        value={practiceCount}
                                        onChange={(e) => {
                                            const maxProblems = selectedCollection ? getProblemsInCollection(selectedCollection).length : 0;
                                            setPracticeCount(Math.min(parseInt(e.target.value) || 1, maxProblems));
                                        }}
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <p className="text-xs text-slate-400 mt-1">
                                         Max available: {selectedCollection ? getProblemsInCollection(selectedCollection).length : 0}
                                    </p>
                                </div>

                                {practiceMode === 'timed' && (
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                                            Time Limit (minutes)
                                        </label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="180"
                                            value={practiceTimeLimit}
                                            onChange={(e) => setPracticeTimeLimit(parseInt(e.target.value) || 75)}
                                            className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                )}

                                <div className="bg-slate-900/50 p-3 rounded-lg">
                                    <h4 className="text-sm font-medium text-slate-300 mb-2">Practice Summary</h4>
                                    <div className="text-sm text-slate-400 space-y-1">
                                        <div>Mode: <span className="text-white">{practiceMode.charAt(0).toUpperCase() + practiceMode.slice(1)}</span></div>
                                        <div>Problems: <span className="text-white">{practiceCount}</span></div>
                                        {practiceMode === 'timed' && (
                                            <div>Time Limit: <span className="text-white">{practiceTimeLimit} minutes</span></div>
                                        )}
                                        {practiceMode === 'sprint' && (
                                            <div>Time Limit: <span className="text-white">5 minutes</span></div>
                                        )}
                                        <div>Collection: <span className="text-white">
                                            {selectedCollection?.name || 'No collection selected'}
                                        </span></div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={() => {
                                        setShowPracticeSetup(false);
                                        if (viewMode !== 'collection') {
                                            setSelectedCollection(null);
                                        }
                                    }}
                                        variant="outline"
                                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={() => {
                                            if (selectedCollection) {
                                                const problemsToUse = getProblemsInCollection(selectedCollection);
                                            startPracticeSession(problemsToUse, practiceMode);
                                        }
                                    }}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                                        disabled={!selectedCollection || getProblemsInCollection(selectedCollection).length === 0}
                                    >
                                        Start Practice
                                    </Button>
                                    {!selectedCollection && (
                                            <p className="text-amber-400 text-sm mt-2">
                                                Please select a collection first to start practicing.
                                            </p>
                                        )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Create Collection Modal */}
                {showCreateCollection && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Plus className="h-5 w-5" />
                                    Create New Collection
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">Collection Name</label>
                                    <input
                                        type="text"
                                        value={newCollectionName}
                                        onChange={(e) => setNewCollectionName(e.target.value)}
                                        placeholder="Enter collection name..."
                                        className="w-full px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'].map(color => (
                                            <button
                                                key={color}
                                                onClick={() => setNewCollectionColor(color)}
                                                className={`w-8 h-8 rounded-full border-2 transition-all ${
                                                    newCollectionColor === color ? 'border-white scale-110' : 'border-slate-600'
                                                }`}
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-slate-900/50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-300">
                                        <span className="font-medium">{selectedProblems.size} problems</span> will be added to this collection
                                    </p>
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={() => {
                                            setShowCreateCollection(false);
                                            setNewCollectionName('');
                                            setNewCollectionColor('#3b82f6');
                                        }}
                                        variant="outline"
                                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={createCollection}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={!newCollectionName.trim() || selectedProblems.size === 0}
                                    >
                                        Create Collection
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Add to Collection Modal */}
                {showAddToCollection && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <Card className="bg-slate-800 border-slate-700 w-full max-w-md">
                            <CardHeader>
                                <CardTitle className="text-white flex items-center gap-2">
                                    <Plus className="h-5 w-5" />
                                    {selectedCollectionForAdd ? 'Confirm Addition' : 'Add to Existing Collection'}
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="bg-slate-900/50 p-3 rounded-lg">
                                    <p className="text-sm text-slate-300">
                                        <span className="font-medium">{selectedProblems.size} problems</span> will be added
                                        {selectedCollectionForAdd && (
                                            <span> to <span className="font-medium text-white">{selectedCollectionForAdd.name}</span></span>
                                        )}
                                    </p>
                                </div>

                                {!selectedCollectionForAdd ? (
                                    <div>
                                        <label className="text-sm font-medium text-slate-300 mb-2 block">Select Collection</label>
                                        <div className="space-y-2 max-h-48 overflow-y-auto">
                                            {collections.map((collection) => (
                                                <button
                                                    key={collection.id}
                                                    onClick={() => setSelectedCollectionForAdd(collection)}
                                                    className="w-full p-3 rounded-lg border border-slate-600 bg-slate-900/50 text-slate-300 hover:bg-slate-700 transition-colors text-left"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div 
                                                            className="w-4 h-4 rounded-full flex-shrink-0" 
                                                            style={{ backgroundColor: collection.color }}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-white">{collection.name}</div>
                                                            <div className="text-sm text-slate-400">
                                                                {collection.problem_count} problems
                                                            </div>
                                                        </div>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-600">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div 
                                                className="w-6 h-6 rounded-full" 
                                                style={{ backgroundColor: selectedCollectionForAdd.color }}
                                            />
                                            <div>
                                                <div className="font-medium text-white">{selectedCollectionForAdd.name}</div>
                                                <div className="text-sm text-slate-400">
                                                    Currently has {selectedCollectionForAdd.problem_count} problems
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-sm text-slate-300">
                                            After adding, this collection will have{' '}
                                            <span className="font-medium text-white">
                                                {selectedCollectionForAdd.problem_count + selectedProblems.size}
                                            </span>{' '}
                                            problems total.
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={() => {
                                            setShowAddToCollection(false);
                                            setSelectedCollectionForAdd(null);
                                        }}
                                        variant="outline"
                                        className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-700"
                                    >
                                        Cancel
                                    </Button>
                                    
                                    {selectedCollectionForAdd ? (
                                <>
                                    <Button
                                        onClick={() => setSelectedCollectionForAdd(null)}
                                        variant="outline"
                                        className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                        disabled={addingToCollection}
                                    >
                                        Back
                                    </Button>
                                    <Button
                                        onClick={() => addToExistingCollection(selectedCollectionForAdd.id)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white"
                                        disabled={addingToCollection}
                                    >
                                        {addingToCollection ? (
                                            <>
                                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                                                Adding...
                                            </>
                                        ) : (
                                            'Confirm'
                                        )}
                                    </Button>
                                </>
                            ) : (
                                <Button
                                    disabled
                                    className="flex-1 bg-gray-600 cursor-not-allowed"
                                >
                                    Select Collection
                                </Button>
                            )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Problems Grid */}
                {filteredProblems.length === 0 ? (
                    <Card className="bg-slate-800/50 border-slate-700">
                        <CardContent className="py-12">
                            <div className="text-center space-y-4">
                                <BookmarkX className="h-16 w-16 text-slate-400 mx-auto" />
                                <div>
                                    <h3 className="text-xl font-semibold text-white mb-2">
                                        {viewMode === 'collection' ? 'No problems in this collection' : 'No bookmarked problems found'}
                                    </h3>
                                    <p className="text-slate-400 max-w-md mx-auto">
                                        {viewMode === 'collection' 
                                            ? 'This collection is empty. Go back to all problems to add some!'
                                            : filters.searchTerm || filters.selectedTopics.length > 0 || filters.selectedDifficulties.length > 0
                                                ? 'No problems match your current filters. Try adjusting your search criteria.'
                                                : 'Start exploring problems and bookmark the ones you want to practice later.'
                                        }
                                    </p>
                                </div>
                                <div className="flex gap-3 justify-center">
                                    {viewMode === 'collection' ? (
                                        <Button
                                            onClick={backToAllProblems}
                                            className="bg-blue-600 hover:bg-blue-700 text-white"
                                        >
                                            <ArrowLeft className="h-4 w-4 mr-2" />
                                            Back to All Problems
                                        </Button>
                                    ) : (
                                        <>
                                            <Button
                                                onClick={() => navigate('/dashboard')}
                                                variant="outline"
                                                className="border-slate-600 text-slate-300 hover:bg-slate-700"
                                            >
                                                Browse Problems
                                            </Button>
                                            {(filters.searchTerm || filters.selectedTopics.length > 0 || filters.selectedDifficulties.length > 0) && (
                                                <Button
                                                    onClick={() => setFilters({
                                                        searchTerm: '',
                                                        selectedTopics: [],
                                                        selectedDifficulties: [],
                                                        selectedCollections: [],
                                                        showUncategorized: false
                                                    })}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                                >
                                                    Clear Filters
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-6">
                        {filteredProblems.map((problem) => (
                            <Card key={problem.unique_problem_id} className="bg-slate-800/50 border-slate-700 hover:bg-slate-800/70 transition-colors">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="checkbox"
                                                checked={selectedProblems.has(problem.unique_problem_id)}
                                                onChange={() => toggleProblemSelection(problem.unique_problem_id)}
                                                className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                                            />
                                            <Badge className={getDifficultyColor(problem.difficulty)}>
                                                Level {problem.difficulty}
                                            </Badge>
                                            <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                                                {problem.topic}
                                            </Badge>
                                            <Badge variant="outline" className="border-slate-600 text-slate-400">
                                                {problem.source}
                                            </Badge>
                                            {problem.year && (
                                                <Badge variant="outline" className="border-slate-600 text-slate-400">
                                                    {problem.year}
                                                </Badge>
                                            )}
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <Button
                                                onClick={() => toggleSolution(problem.unique_problem_id)}
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-400 hover:text-blue-400"
                                            >
                                                {expandedSolutions.has(problem.unique_problem_id) ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                onClick={() => removeBookmark(problem.unique_problem_id)}
                                                disabled={removing === problem.unique_problem_id}
                                                variant="ghost"
                                                size="sm"
                                                className="text-slate-400 hover:text-red-400"
                                            >
                                                {removing === problem.unique_problem_id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-600 border-t-red-400"></div>
                                                ) : (
                                                    <BookmarkX className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                
                                <CardContent className="space-y-4">
                                    <div className="text-white text-lg">
                                        <MathRenderer content={problem.problem} />
                                    </div>
                                    
                                    {expandedSolutions.has(problem.unique_problem_id) && (
                                        <div className="border-t border-slate-700 pt-4 space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold text-green-400 mb-2">Answer:</h4>
                                                <div className="text-white bg-slate-900/50 p-3 rounded-lg">
                                                    <MathRenderer content={problem.answer} />
                                                </div>
                                            </div>
                                            
                                            {problem.solution && (
                                                <div>
                                                    <h4 className="text-sm font-semibold text-blue-400 mb-2">Solution:</h4>
                                                    <div className="text-slate-300 bg-slate-900/50 p-3 rounded-lg">
                                                        <MathRenderer content={problem.solution} />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}

                {/* Selection Summary */}
                {selectedProblems.size > 0 && (
                    <div className="fixed bottom-6 right-6 bg-slate-800 border border-slate-600 rounded-lg p-4 shadow-lg z-40">
                        <div className="flex items-center gap-3">
                            <div className="text-white">
                                <span className="font-semibold">{selectedProblems.size}</span> problems selected
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    onClick={() => setSelectedProblems(new Set())}
                                    variant="ghost"
                                    size="sm"
                                    className="text-slate-400 hover:text-white"
                                >
                                    Clear
                                </Button>
                                <Button
                                    onClick={() => setShowCreateCollection(true)}
                                    size="sm"
                                    className="bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Create Collection
                                </Button>
                                <Button
                                    onClick={() => setShowAddToCollection(true)}
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    disabled={collections.length === 0}
                                >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add to Collection
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}