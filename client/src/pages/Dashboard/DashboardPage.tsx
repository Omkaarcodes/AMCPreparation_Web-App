import React, { useEffect, useState, useRef, useCallback } from "react";
import { useXP } from '../../hooks/contexts/XPContext';

import { 
    getAuth, 
    onAuthStateChanged,
    signOut,
    updateProfile,
    User
} from 'firebase/auth';
import { useNavigate } from "react-router-dom";
import { 
    Breadcrumb, 
    BreadcrumbItem, 
    BreadcrumbLink, 
    BreadcrumbList, 
    BreadcrumbPage, 
    BreadcrumbSeparator 
} from "../../components/ui/breadcrumb";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from "../../components/ui/card";
import { 
    Activity, 
    CreditCard, 
    DollarSign, 
    Users, 
    TrendingUp, 
    Calendar,
    Bell,
    Search,
    ArrowUpRight,
    ArrowDownRight,
    BarChart3,
    Sparkles,
    Home,
    Settings,
    FileText,
    Star,
    History,
    Briefcase,
    MoreHorizontal,
    ChevronRight,
    ChevronDown,
    BookOpen,
    Brain,
    Clock,
    BookMarked,
    Target,
    RotateCcw,
    Flame,
    Trophy,
    Swords,
    Database,
    List,
    Bookmark,
    X,
    Edit3,
    Save,
    Loader2,
    Zap,
    Award,
    TrendingUpIcon,
    CheckCircle,
    AlertCircle
} from "lucide-react";

import ProblemsSolvedWidget from './Problem_Explorer'
import { XPProgressManager, XPProgress } from '../../components/XPBonuses';

// Add Problem interface
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

interface UserProfile {
    id: string;
    created_at: string;
    email?: string;
    display_name?: string;
    last_seen?: string;
}

// XP Action Types for different activities
const XP_ACTIONS = {
    PROBLEM_SOLVED_EASY: { amount: 10, message: "Easy problem solved!" },
    PROBLEM_SOLVED_MEDIUM: { amount: 20, message: "Medium problem solved!" },
    PROBLEM_SOLVED_HARD: { amount: 35, message: "Hard problem solved!" },
    QUIZ_COMPLETED: { amount: 50, message: "Quiz completed!" },
    DAILY_LOGIN: { amount: 5, message: "Daily login bonus!" },
    STREAK_BONUS: { amount: 10, message: "Streak bonus!" },
    FIRST_TRY_CORRECT: { amount: 5, message: "First try bonus!" },
    TOPIC_MASTERY: { amount: 100, message: "Topic mastered!" }
};

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [expandedMenus, setExpandedMenus] = useState<{ [key: string]: boolean }>({});
    const [showProblemExplorer, setShowProblemExplorer] = useState(false);
    const [practiceProblems, setPracticeProblems] = useState<Problem[]>([]);
    const [showPracticeSession, setShowPracticeSession] = useState(false);
    
    // XP and Progress related state
    
    const [xpProgress, setXpProgress] = useState<XPProgress | null>(null);
    const [xpManager, setXpManager] = useState<XPProgressManager | null>(null);
    const [xpLoading, setXpLoading] = useState(true);
    const [showXPNotification, setShowXPNotification] = useState(false);
    const [xpNotificationData, setXpNotificationData] = useState<{
        amount: number;
        message: string;
        levelUp?: { oldLevel: number; newLevel: number };
    } | null>(null);
    const [unsavedXP, setUnsavedXP] = useState(0);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    
    const [isEditingDisplayName, setIsEditingDisplayName] = useState(false);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [isUpdatingDisplayName, setIsUpdatingDisplayName] = useState(false);
    const [displayNameError, setDisplayNameError] = useState('');
    
    const auth = getAuth();
    const navigate = useNavigate();
    const xpManagerRef = useRef<XPProgressManager | null>(null);

    const sidebarItems = [
        {
            label: "Practice",
            items: [
                { 
                    name: "Dashboard", 
                    icon: Home, 
                    isActive: true, 
                    hasSubmenu: false,
                    hasUrl: false,
                    url: ""
                },
                { 
                    name: "Topic Practice", 
                    icon: BookOpen, 
                    isActive: false, 
                    hasSubmenu: true,
                    hasUrl: false,
                    url: "",
                    submenu: [
                        { name: "Algebra", isActive: false },
                        { name: "Geometry", isActive: false },
                        { name: "Number Theory", isActive: false },
                        { name: "Combinatorics", isActive: false },
                        { name: "Probability", isActive: false }
                    ]
                },
                { 
                    name: "Adaptive Quiz", 
                    icon: Brain, 
                    isActive: false, 
                    hasSubmenu: true,
                    hasUrl: false,
                    url: "",
                    submenu: [
                        { name: "Quick Quiz", isActive: false },
                        { name: "Adaptive Mode", isActive: false },
                        { name: "Difficulty Ladder", isActive: false }
                    ]
                },
                { name: "Mock Exams", icon: Clock, isActive: false, hasUrl: true, url: "/mock-exams" },
                { name: "Error Journal", icon: BookMarked, isActive: false, hasUrl: false, url: "" },
            ]
        },
        {
            label: "Progress",
            items: [
                { 
                    name: "Analytics", 
                    icon: BarChart3, 
                    isActive: false, 
                    hasSubmenu: true,
                    hasUrl: false,
                    url: "",
                    submenu: [
                        { name: "Performance", isActive: false },
                        { name: "Speed Analysis", isActive: false },
                        { name: "Topic Mastery", isActive: false }
                    ]
                },
                { 
                    name: "Mastery Map", 
                    icon: Target, 
                    isActive: false, 
                    hasSubmenu: false,
                    hasUrl: false,
                    url: ""
                },
                { 
                    name: "Spaced Review", 
                    icon: RotateCcw, 
                    isActive: false, 
                    hasSubmenu: true,
                    hasUrl: false,
                    url: "",
                    submenu: [
                        { name: "Due Today", isActive: false },
                        { name: "Schedule", isActive: false },
                        { name: "Overdue", isActive: false }
                    ]
                },
                { name: "Study Streaks", icon: Flame, isActive: false },
            ]
        },
        {
            label: "Competition",
            items: [
                { name: "Weekly Challenges", icon: Calendar, isActive: false },
                { name: "Badges & XP", icon: Star, isActive: false },
            ]
        },
        {
            label: "Library",
            items: [
                { name: "Problem Bank", icon: Database, isActive: false },
                { name: "Custom Playlists", icon: List, isActive: false },
                { name: "Saved Problems", icon: Bookmark, isActive: false },
                { name: "Settings", icon: Settings, isActive: false },
            ]
        }
    ];

    // Initialize XP Manager when user is available
    const initializeXPManager = useCallback(async (currentUser: User) => {
        try {
            const manager = new XPProgressManager(currentUser);
            const progress = await manager.loadProgress();
            
            setXpManager(manager);
            setXpProgress(progress);
            xpManagerRef.current = manager;
            
            // Award daily login bonus if it's a new day
            awardDailyLoginBonus(manager, progress);
            
            setXpLoading(false);
        } catch (error) {
            console.error('Failed to initialize XP manager:', error);
            setXpLoading(false);
        }
    }, []);

    // Award daily login bonus
    const awardDailyLoginBonus = (manager: XPProgressManager, progress: XPProgress) => {
        const today = new Date();
        const lastXPDate = progress.last_xp_earned ? new Date(progress.last_xp_earned) : null;
        
        if (!lastXPDate || lastXPDate.toDateString() !== today.toDateString()) {
            const result = manager.addXP(XP_ACTIONS.DAILY_LOGIN.amount, 'daily_login');
            showXPGain(XP_ACTIONS.DAILY_LOGIN.amount, XP_ACTIONS.DAILY_LOGIN.message, result);
            
            // Update streak
            manager.updateStreak(true);
            
            // Check for streak bonus
            const currentProgress = manager.getCurrentProgress();
            if (currentProgress.streak_days > 1 && currentProgress.streak_days % 7 === 0) {
                const streakResult = manager.addXP(XP_ACTIONS.STREAK_BONUS.amount, 'streak_bonus');
                setTimeout(() => {
                    showXPGain(XP_ACTIONS.STREAK_BONUS.amount, `${currentProgress.streak_days} day streak bonus!`, streakResult);
                }, 1500);
            }
            
            setXpProgress(manager.getCurrentProgress());
        }
    };

    // Show XP gain notification
    const showXPGain = (amount: number, message: string, result?: { leveledUp: boolean; newLevel?: number; oldLevel?: number }) => {
        setXpNotificationData({
            amount,
            message,
            levelUp: result?.leveledUp ? { oldLevel: result.oldLevel!, newLevel: result.newLevel! } : undefined
        });
        setShowXPNotification(true);
        
        // Auto hide notification
        setTimeout(() => {
            setShowXPNotification(false);
            setXpNotificationData(null);
        }, result?.leveledUp ? 5000 : 3000);
    };

    // Public method to award XP (can be called from other components)
    const awardXP = useCallback((action: keyof typeof XP_ACTIONS, customAmount?: number, customMessage?: string) => {
        if (!xpManager) return;
        
        const xpData = XP_ACTIONS[action];
        const amount = customAmount ?? xpData.amount;
        const message = customMessage ?? xpData.message;
        
        const result = xpManager.addXP(amount, action);
        showXPGain(amount, message, result);
        
        setXpProgress(xpManager.getCurrentProgress());
        setUnsavedXP(xpManager.getPendingXP());
    }, [xpManager]);

    // Set up online/offline listeners
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            if (xpManager) {
                xpManager.setOnlineStatus(true);
            }
        };

        const handleOffline = () => {
            setIsOnline(false);
            if (xpManager) {
                xpManager.setOnlineStatus(false);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [xpManager]);

    // Update unsaved XP periodically
    useEffect(() => {
        const interval = setInterval(() => {
            if (xpManager) {
                setUnsavedXP(xpManager.getPendingXP());
            }
        }, 5000);

        return () => clearInterval(interval);
    }, [xpManager]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            
            if (!currentUser) {
                navigate('/login');
            } else {
                setNewDisplayName(currentUser.displayName || '');
                initializeXPManager(currentUser);
            }
        });

        return () => unsubscribe();
    }, [auth, navigate, initializeXPManager]);

    useEffect(() => {
        setMounted(true);
    }, []);

    // Cleanup XP manager on unmount
    useEffect(() => {
        return () => {
            if (xpManagerRef.current) {
                xpManagerRef.current.destroy();
            }
        };
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

    const getDisplayName = () => {
        if (user?.displayName) {
            return user.displayName;
        }
        if (user?.email) {
            return user.email.split('@')[0];
        }
        return 'User';
    };

    const handleLogout = async () => {
        try {
            if (xpManager) {
                await xpManager.forceSave();
            }
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    // Existing functions for display name management...
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

    const updateDisplayNameInDatabase = async (displayName: string): Promise<void> => {
        if (!user) {
            throw new Error('No Firebase user signed in');
        }

        console.log('Updating display name in database...');
        const token = await getSupabaseToken();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${user.uid}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify({
                display_name: displayName,
                last_seen: new Date().toISOString()
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Database update error:', errorText);
            
            if (response.status === 404 || errorText.includes('No rows found')) {
                console.log('Profile not found, creating new profile...');
                await createUserProfile(displayName);
                return;
            }
            
            throw new Error(`Database update failed: HTTP ${response.status}: ${errorText}`);
        }

        const updatedProfile = await response.json();
        console.log('Display name updated in database:', updatedProfile);
    };

    const createUserProfile = async (displayName: string): Promise<void> => {
        if (!user) {
            throw new Error('No Firebase user signed in');
        }

        console.log('Creating user profile in database...');
        const token = await getSupabaseToken();
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

        const profileData = {
            id: user.uid,
            email: user.email,
            display_name: displayName,
            last_seen: new Date().toISOString()
        };

        const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey': anonKey,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            },
            body: JSON.stringify(profileData)
        });

        if (!response.ok) {
            const errorText = await response.text();
            
            if (response.status === 409 || errorText.includes('duplicate key')) {
                console.log('Profile already exists, updating instead...');
                await updateDisplayNameInDatabase(displayName);
                return;
            }
            
            throw new Error(`Profile creation failed: HTTP ${response.status}: ${errorText}`);
        }

        const createdProfile = await response.json();
        console.log('User profile created:', createdProfile);
    };

    const handleEditDisplayName = () => {
        setIsEditingDisplayName(true);
        setNewDisplayName(user?.displayName || '');
        setDisplayNameError('');
    };

    const handleCancelEdit = () => {
        setIsEditingDisplayName(false);
        setNewDisplayName(user?.displayName || '');
        setDisplayNameError('');
    };

    const handleSaveDisplayName = async () => {
        if (!user || !newDisplayName.trim()) {
            setDisplayNameError('Display name cannot be empty');
            return;
        }

        if (newDisplayName.trim() === user.displayName) {
            setIsEditingDisplayName(false);
            return;
        }

        setIsUpdatingDisplayName(true);
        setDisplayNameError('');

        try {
            const trimmedName = newDisplayName.trim();
            
            console.log('Updating Firebase Auth profile...');
            await updateProfile(user, {
                displayName: trimmedName
            });

            await updateDisplayNameInDatabase(trimmedName);
            await user.reload();
            
            setIsEditingDisplayName(false);
            console.log('Display name updated successfully in both Firebase and database');
        } catch (error) {
            console.error('Error updating display name:', error);
            
            if (error instanceof Error) {
                if (error.message.includes('Edge function failed')) {
                    setDisplayNameError('Failed to authenticate with database. Please try again.');
                } else if (error.message.includes('Database update failed')) {
                    setDisplayNameError('Failed to update database. Your Firebase profile was updated but database sync failed.');
                } else {
                    setDisplayNameError(`Failed to update display name: ${error.message}`);
                }
            } else {
                setDisplayNameError('Failed to update display name. Please try again.');
            }
        } finally {
            setIsUpdatingDisplayName(false);
        }
    };

    const toggleSubmenu = (menuKey: string) => {
        setExpandedMenus(prev => ({
            ...prev,
            [menuKey]: !prev[menuKey]
        }));
    };

    const handleStatClick = (statTitle: string) => {
        if (statTitle === "Problems Solved") {
            setShowProblemExplorer(true);
        }
    };

    const handleStartPractice = (problems: Problem[]) => {
        setPracticeProblems(problems);
        setShowPracticeSession(true);
        setShowProblemExplorer(false);
    };

    const handleClosePractice = () => {
        setShowPracticeSession(false);
        setPracticeProblems([]);
    };

    const handleNavigate = (url: string) => {
        navigate(url);
    };

    // Demo function to test XP system
    const testXPGain = () => {
        awardXP('PROBLEM_SOLVED_MEDIUM');
    };

    // Get level progress percentage
    const getLevelProgress = () => {
        return xpManager ? xpManager.getLevelProgress() : 0;
    };

    const stats = [
        {
            title: "Problems Solved",
            value: "1,247",
            change: "+23",
            changeText: "this week",
            icon: Target,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
            trend: "up",
            clickable: true
        },
        {
            title: "Current Streak",
            value: xpProgress ? `${xpProgress.streak_days} days` : "0 days",
            change: xpProgress && xpProgress.streak_days > 0 ? `+${xpProgress.streak_days > 1 ? '1' : xpProgress.streak_days}` : "0",
            changeText: "streak active",
            icon: Flame,
            color: "text-orange-400",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
            trend: "up"
        },
        {
            title: "Current Level",
            value: xpProgress ? `Level ${xpProgress.current_level}` : "Level 1",
            change: `${Math.round(getLevelProgress())}%`,
            changeText: "to next level",
            icon: Star,
            color: "text-purple-400",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
            trend: "up"
        },
        {
            title: "Total XP",
            value: xpProgress ? xpProgress.total_xp.toLocaleString() : "0",
            change: xpProgress ? `+${xpProgress.daily_xp_earned}` : "+0",
            changeText: "today",
            icon: Zap,
            color: "text-blue-400",
            bgColor: "bg-blue-500/10",
            borderColor: "border-blue-500/20",
            trend: "up"
        }
    ];

    const recentActivities = [
        {
            action: "Completed Algebra Quiz",
            user: "Score: 9/10 (+50 XP)",
            time: "2 minutes ago",
            type: "quiz",
            color: "bg-emerald-500"
        },
        {
            action: "Earned 'Problem Solver' badge",
            user: "50 problems milestone",
            time: "1 hour ago",
            type: "achievement",
            color: "bg-purple-500"
        },
        {
            action: "Geometry topic mastery",
            user: "85% accuracy reached (+100 XP)",
            time: "3 hours ago",
            type: "mastery",
            color: "bg-blue-500"
        },
        {
            action: "Weekly challenge completed",
            user: "Ranked #12 globally",
            time: "Yesterday",
            type: "challenge",
            color: "bg-orange-500"
        }
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700"></div>
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-slate-300 font-medium animate-pulse bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                        Loading dashboard...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <>
            {/* XP Notification */}
            {showXPNotification && xpNotificationData && (
                <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-right-4 fade-in duration-500">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-xl shadow-2xl border border-blue-400/20 max-w-sm">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-lg">
                                <Zap className="h-5 w-5" />
                            </div>
                            <div className="flex-1">
                                <p className="font-medium">+{xpNotificationData.amount} XP</p>
                                <p className="text-sm opacity-90">{xpNotificationData.message}</p>
                                {xpNotificationData.levelUp && (
                                    <p className="text-xs font-bold text-yellow-300 animate-pulse">
                                        Level Up! {xpNotificationData.levelUp.oldLevel} → {xpNotificationData.levelUp.newLevel}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Connection Status Indicator */}
            {!isOnline && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-40 bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Offline - Progress saved locally
                    </div>
                </div>
            )}

            {/* Unsaved Changes Indicator */}
            {unsavedXP > 0 && (
                <div className="fixed bottom-4 right-4 z-40">
                    <div className="bg-yellow-500/90 text-white px-3 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        {unsavedXP} XP pending save
                    </div>
                </div>
            )}

            <div className="flex h-screen bg-slate-900">
                {/* Fixed Sidebar */}
                <div className="w-64 bg-slate-950 border-r border-slate-800/50 flex flex-col">
                    {/* Logo */}
                    <div className="p-6 border-b border-slate-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                                <span className="text-white font-bold text-sm">A</span>
                            </div>
                            <div>
                                <h2 className="text-white font-semibold">AMCraft</h2>
                                <p className="text-slate-400 text-xs">AMC 10/12 Preparation</p>
                            </div>
                        </div>
                    </div>

                    {/* XP Progress Bar */}
                    {xpProgress && !xpLoading && (
                        <div className="p-4 border-b border-slate-800/50">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-400">Level {xpProgress.current_level}</span>
                                    <span className="text-xs text-slate-400">{xpProgress.total_xp.toLocaleString()} XP</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-gradient-to-r from-blue-500 to-purple-600 h-full transition-all duration-500 ease-out"
                                        style={{ width: `${getLevelProgress()}%` }}
                                    ></div>
                                </div>
                                <div className="text-xs text-slate-500 text-center">
                                    {Math.round(getLevelProgress())}% to Level {xpProgress.current_level + 1}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-6 overflow-y-auto">
                        {sidebarItems.map((section, sectionIndex) => (
                            <div key={sectionIndex} className={`space-y-2 ${mounted ? 'animate-in slide-in-from-left-2 fade-in' : ''}`}
                                 style={{ animationDelay: `${sectionIndex * 100}ms` }}>
                                <h3 className="text-xs font-medium text-slate-400 uppercase tracking-wider px-2">
                                    {section.label}
                                </h3>
                                <div className="space-y-1">
                                    {section.items.map((item, itemIndex) => {
                                        const menuKey = `${sectionIndex}-${itemIndex}`;
                                        const isExpanded = expandedMenus[menuKey];
                                        
                                        return (
                                            <div key={itemIndex}>
                                                <div 
                                                    className={`group flex items-center justify-between px-2 py-2 rounded-lg transition-all duration-200 hover:bg-slate-800/50 cursor-pointer ${
                                                        item.isActive ? 'bg-blue-500/10 border-l-2 border-blue-500' : ''
                                                    }`}
                                                    onClick={() => {
                                                            if (item.hasUrl && item.url.length > 0) {
                                                                handleNavigate(item.url);
                                                                return;
                                                            }
                                                            if (item.hasSubmenu) {
                                                                toggleSubmenu(menuKey);
                                                            }
                                                            }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <item.icon className={`w-4 h-4 ${item.isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'}`} />
                                                        <span className={`text-sm font-medium ${item.isActive ? 'text-blue-400' : 'text-slate-300 group-hover:text-white'}`}>
                                                            {item.name}
                                                        </span>
                                                    </div>
                                                    {item.hasSubmenu && (
                                                        <div className="transition-transform duration-200">
                                                            {isExpanded ? (
                                                                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-300" />
                                                            ) : (
                                                                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-300" />
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                                
                                                {item.hasSubmenu && isExpanded && item.submenu && (
                                                    <div className="ml-6 mt-1 space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                                        {item.submenu.map((subItem, subIndex) => (
                                                            <div 
                                                                key={subIndex}
                                                                className={`group flex items-center px-2 py-1.5 rounded-md transition-all duration-200 hover:bg-slate-800/30 cursor-pointer ${
                                                                    subItem.isActive ? 'bg-blue-500/5 text-blue-400' : ''
                                                                }`}
                                                            >
                                                                <div className="w-1.5 h-1.5 bg-slate-600 rounded-full mr-3 group-hover:bg-slate-400 transition-colors"></div>
                                                                <span className={`text-xs font-medium ${
                                                                    subItem.isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-300'
                                                                }`}>
                                                                    {subItem.name}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </nav>

                    {/* User Profile */}
                    <div className="p-4 border-t border-slate-800/50">
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer">
                            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                <span className="text-white font-medium text-sm">
                                    {getDisplayName().charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-300 truncate">{getDisplayName()}</p>
                                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="bg-slate-900/95 backdrop-blur-sm border-b border-slate-800/50 px-6 py-4">
                        <div className="flex items-center justify-between">
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink href="#" className="text-slate-400 hover:text-white transition-colors">
                                            Dashboard
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator className="text-slate-600" />
                                    <BreadcrumbItem>
                                        <BreadcrumbPage className="text-white font-medium">Overview</BreadcrumbPage>
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                            
                            <div className="flex items-center space-x-4">
                                <div className="relative group">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4 group-focus-within:text-blue-400 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search..."
                                        className="pl-10 pr-4 py-2 w-64 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                                    />
                                </div>
                                <button className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200 relative">
                                    <Bell className="h-5 w-5 text-slate-400 hover:text-white" />
                                    <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse"></span>
                                </button>

                                {/* Test XP Button - Remove in production
                                <button 
                                    onClick={testXPGain}
                                    className="px-3 py-1 bg-green-500/20 text-green-400 rounded text-xs hover:bg-green-500/30 transition-colors"
                                    title="Test XP Gain"
                                >
                                    +XP
                                </button> */}
                            </div>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 overflow-auto p-6 space-y-6">
                        {/* Welcome Section */}
                        <div className={`bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 ${mounted ? 'animate-in slide-in-from-top-4 fade-in duration-700' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div className="space-y-2">
                                    <h1 className="text-2xl font-bold text-white">
                                        Welcome back, {getDisplayName()}!
                                    </h1>
                                    <p className="text-slate-400">
                                        Here's the latest in your AMC 10/12 preparation journey!
                                    </p>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                                        <Calendar className="h-5 w-5 text-blue-400" />
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-medium text-white">
                                            {new Date().toLocaleDateString('en-US', { 
                                                weekday: 'long'
                                            })}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {new Date().toLocaleDateString('en-US', { 
                                                month: 'long', 
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {stats.map((stat, index) => (
                                <Card 
                                    key={index} 
                                    className={`group ${stat.clickable ? 'cursor-pointer' : ''} bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 hover:scale-105 ${mounted ? 'animate-in slide-in-from-bottom-4 fade-in' : ''}`} 
                                    style={{ animationDelay: `${index * 150}ms` }}
                                    onClick={() => stat.clickable && handleStatClick(stat.title)}
                                >
                                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                                        <CardTitle className="text-sm font-medium text-slate-400 group-hover:text-slate-300 transition-colors">
                                            {stat.title}
                                            {stat.clickable && (
                                                <span className="ml-2 text-xs text-slate-500 group-hover:text-slate-400">
                                                    (click to explore)
                                                </span>
                                            )}
                                        </CardTitle>
                                        <div className={`p-2 rounded-lg ${stat.bgColor} border ${stat.borderColor} group-hover:scale-110 transition-transform duration-200`}>
                                            <stat.icon className={`h-4 w-4 ${stat.color}`} />
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        <div className="text-2xl font-bold text-white group-hover:text-slate-100 transition-colors">
                                            {stat.value}
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="flex items-center space-x-1 text-emerald-400">
                                                <ArrowUpRight className="h-3 w-3" />
                                                <span className="text-xs font-medium">{stat.change}</span>
                                            </div>
                                            <p className="text-xs text-slate-500">{stat.changeText}</p>
                                        </div>
                                        {stat.title === "Current Level" && xpProgress && (
                                            <div className="mt-2">
                                                <div className="w-full bg-slate-700 rounded-full h-1.5">
                                                    <div 
                                                        className="bg-gradient-to-r from-purple-500 to-blue-500 h-full rounded-full transition-all duration-500"
                                                        style={{ width: `${getLevelProgress()}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Content Grid */}
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                            {/* Chart Area */}
                            <Card className={`col-span-4 bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300 ${mounted ? 'animate-in slide-in-from-left-4 fade-in duration-700' : ''}`}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-3 text-white">
                                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                                            <BarChart3 className="h-5 w-5 text-white" />
                                        </div>
                                        Performance Analytics
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Your problem-solving performance and XP progression over time
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-[300px] flex items-center justify-center bg-slate-900/50 rounded-xl border-2 border-dashed border-slate-700 hover:border-slate-600 transition-colors duration-300">
                                        <div className="text-center space-y-4">
                                            <div className="relative">
                                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
                                                <BarChart3 className="h-16 w-16 text-slate-500 mx-auto relative" />
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-slate-300 font-medium">XP and performance visualization would go here</p>
                                                <p className="text-sm text-slate-500">
                                                    Level progression, XP trends, topic mastery, and accuracy improvements
                                                </p>
                                                {xpProgress && (
                                                    <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                                                        <div className="bg-slate-800/50 p-3 rounded-lg">
                                                            <div className="text-blue-400 font-medium">Daily XP</div>
                                                            <div className="text-white text-lg">{xpProgress.daily_xp_earned}</div>
                                                        </div>
                                                        <div className="bg-slate-800/50 p-3 rounded-lg">
                                                            <div className="text-purple-400 font-medium">Next Level</div>
                                                            <div className="text-white text-lg">{xpProgress.xp_towards_next} XP</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Recent Activity */}
                            <Card className={`col-span-3 bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300 ${mounted ? 'animate-in slide-in-from-right-4 fade-in duration-700' : ''}`}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-3 text-white">
                                        <div className="p-2 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg">
                                            <Activity className="h-5 w-5 text-white" />
                                        </div>
                                        Recent Activity
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Latest activities and XP gains
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-3">
                                        {recentActivities.map((activity, index) => (
                                            <div key={index} className={`group flex items-start space-x-3 p-3 rounded-lg hover:bg-slate-700/30 transition-all duration-200 ${mounted ? 'animate-in slide-in-from-right-2 fade-in' : ''}`}
                                                 style={{ animationDelay: `${(index + 5) * 100}ms` }}>
                                                <div className={`w-3 h-3 ${activity.color} rounded-full mt-2 flex-shrink-0 group-hover:scale-110 transition-transform duration-200`}></div>
                                                <div className="flex-1 min-w-0 space-y-1">
                                                    <p className="text-sm font-medium text-white group-hover:text-slate-100 transition-colors">
                                                        {activity.action}
                                                    </p>
                                                    <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">
                                                        {activity.user} • {activity.time}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* XP and Progress Overview */}
                        {xpProgress && !xpLoading && (
                            <Card className={`bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300 ${mounted ? 'animate-in slide-in-from-bottom-4 fade-in duration-700' : ''}`}>
                                <CardHeader className="pb-4">
                                    <CardTitle className="flex items-center gap-3 text-white">
                                        <div className="p-2 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-lg">
                                            <Award className="h-5 w-5 text-white" />
                                        </div>
                                        XP Progress & Achievements
                                    </CardTitle>
                                    <CardDescription className="text-slate-400">
                                        Your learning journey and milestone progress
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-6 md:grid-cols-2">
                                        {/* Level Progress */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-300">Current Level</span>
                                                <span className="text-sm text-blue-400 font-bold">Level {xpProgress.current_level}</span>
                                            </div>
                                            <div className="relative">
                                                <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                                                    <div 
                                                        className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 h-full transition-all duration-1000 ease-out relative"
                                                        style={{ width: `${getLevelProgress()}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between mt-2 text-xs text-slate-500">
                                                    <span>{xpProgress.xp_towards_next} XP</span>
                                                    <span>{Math.round(getLevelProgress())}%</span>
                                                </div>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                {xpManager ? (xpManager as any).getXPForLevel(xpProgress.current_level) - xpProgress.xp_towards_next : 0} XP needed for Level {xpProgress.current_level + 1}
                                            </p>
                                        </div>

                                        {/* Daily Progress */}
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-sm font-medium text-slate-300">Today's Progress</span>
                                                <span className="text-sm text-emerald-400 font-bold">+{xpProgress.daily_xp_earned} XP</span>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-xs">
                                                    <CheckCircle className="h-3 w-3 text-emerald-400" />
                                                    <span className="text-slate-400">Daily login bonus earned</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs">
                                                    <Flame className="h-3 w-3 text-orange-400" />
                                                    <span className="text-slate-400">{xpProgress.streak_days} day streak active</span>
                                                </div>
                                                {xpProgress.streak_days >= 7 && (
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <Trophy className="h-3 w-3 text-yellow-400" />
                                                        <span className="text-yellow-400">Week streak bonus available!</span>
                                                    </div>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => awardXP('PROBLEM_SOLVED_HARD')}
                                                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-200 transform hover:scale-105 font-medium text-sm"
                                            >
                                                Start Practice Session
                                            </button>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* User Info Card */}
                        <Card className={`bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 transition-all duration-300 ${mounted ? 'animate-in slide-in-from-bottom-4 fade-in duration-700' : ''}`}>
                            <CardHeader className="pb-4">
                                <CardTitle className="flex items-center gap-3 text-white">
                                    <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                                        <Sparkles className="h-5 w-5 text-white" />
                                    </div>
                                    Account Information
                                </CardTitle>
                                <CardDescription className="text-slate-400">
                                    Your current account details and settings
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Email</label>
                                        <p className="text-sm text-white font-medium px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700">
                                            {user?.email || 'N/A'}
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Email Verified</label>
                                        <div className="px-3 py-2">
                                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                                user?.emailVerified 
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                                                    : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                            }`}>
                                                {user?.emailVerified ? '✓ Verified' : '✗ Not Verified'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">
                                            Display Name
                                            <span className="text-xs text-slate-500 ml-2">(syncs to database)</span>
                                        </label>
                                        {isEditingDisplayName ? (
                                            <div className="space-y-2">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={newDisplayName}
                                                        onChange={(e) => setNewDisplayName(e.target.value)}
                                                        placeholder="Enter display name"
                                                        className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-200"
                                                        disabled={isUpdatingDisplayName}
                                                    />
                                                    <button
                                                        onClick={handleSaveDisplayName}
                                                        disabled={isUpdatingDisplayName || !newDisplayName.trim()}
                                                        className="px-3 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
                                                    >
                                                        {isUpdatingDisplayName ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Save className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEdit}
                                                        disabled={isUpdatingDisplayName}
                                                        className="px-3 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                                {displayNameError && (
                                                    <p className="text-xs text-red-400">{displayNameError}</p>
                                                )}
                                                {isUpdatingDisplayName && (
                                                    <p className="text-xs text-blue-400">
                                                        Updating Firebase profile and syncing to database...
                                                    </p>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <p className="flex-1 text-sm text-white font-medium px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700">
                                                    {user?.displayName || 'Not set'}
                                                </p>
                                                <button
                                                    onClick={handleEditDisplayName}
                                                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors duration-200 text-slate-400 hover:text-white"
                                                    title="Edit display name"
                                                >
                                                    <Edit3 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-slate-400">Last Sign In</label>
                                        <p className="text-sm text-white font-medium px-3 py-2 bg-slate-900/50 rounded-lg border border-slate-700">
                                            {user?.metadata?.lastSignInTime 
                                                ? new Date(user.metadata.lastSignInTime).toLocaleString() 
                                                : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-slate-700 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={handleLogout}
                                            className="bg-gradient-to-r from-red-500 to-red-600 text-white px-6 py-2 rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 transform hover:scale-105 font-medium"
                                        >
                                            Sign Out
                                        </button>
                                        
                                        {xpManager && (
                                            <button
                                                onClick={() => xpManager.forceSave()}
                                                disabled={unsavedXP === 0}
                                                className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                                                    unsavedXP > 0 
                                                        ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30' 
                                                        : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                                }`}
                                            >
                                                {unsavedXP > 0 ? `Save ${unsavedXP} XP` : 'All Saved'}
                                            </button>
                                        )}
                                    </div>

                                    {/* Connection Status */}
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-400' : 'bg-red-400'}`}></div>
                                        <span className={`text-xs ${isOnline ? 'text-green-400' : 'text-red-400'}`}>
                                            {isOnline ? 'Online' : 'Offline'}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </main>
                </div>
            </div>

            {/* Problem Explorer Modal */}
            {showProblemExplorer && xpManager &&(
                <ProblemsSolvedWidget 
                    isOpen={showProblemExplorer}
                    onClose={() => setShowProblemExplorer(false)}
                    onStartPractice={handleStartPractice}
                    xpManager={xpManager}
                />
            )}

            {/* Practice Session Modal */}
            {showPracticeSession && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-4xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
                        {/* Practice Session Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                                    <Target className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Practice Session</h2>
                                    <p className="text-sm text-slate-400">
                                        {practiceProblems.length} problems loaded
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleClosePractice}
                                className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors duration-200 group"
                            >
                                <X className="h-5 w-5 text-slate-400 group-hover:text-white" />
                            </button>
                        </div>

                        {/* Practice Session Content */}
                        <div className="overflow-auto max-h-[calc(90vh-80px)] p-6">
                            <div className="text-center space-y-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
                                    <Target className="h-16 w-16 text-slate-500 mx-auto relative" />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-slate-300 font-medium">Practice session ready!</p>
                                    <p className="text-sm text-slate-500">
                                        Problem-solving interface would be implemented here
                                    </p>
                                    <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                                        <p className="text-xs text-slate-400 mb-2">Problems loaded:</p>
                                        <div className="flex flex-wrap gap-2">
                                            {practiceProblems.map((problem, index) => (
                                                <span 
                                                    key={problem.unique_problem_id} 
                                                    className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs"
                                                >
                                                    #{index + 1}: {problem.topic} (Diff: {problem.difficulty})
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => awardXP('QUIZ_COMPLETED')}
                                        className="mt-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-200 transform hover:scale-105 font-medium"
                                    >
                                        Complete Practice (+50 XP)
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}