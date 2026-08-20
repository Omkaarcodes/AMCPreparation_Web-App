import React, { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { useNavigate } from "react-router-dom";
import { 
    Breadcrumb, 
    BreadcrumbItem, 
    BreadcrumbLink, 
    BreadcrumbList, 
    BreadcrumbPage, 
    BreadcrumbSeparator 
} from "../components/ui/breadcrumb";
import { 
    Card, 
    CardContent, 
    CardDescription, 
    CardHeader, 
    CardTitle 
} from "../components/ui/card";
import { 
    BarChart3,
    BookMarked,
    Calendar,
    Search,
    TrendingUp,
    AlertTriangle,
    Target,
    Brain,
    Clock,
    Filter,
    ArrowUpRight,
    CheckCircle,
    XCircle,
    Eye,
    ChevronDown,
    Loader2,
    PieChart,
    Activity,
    Lightbulb
} from "lucide-react";
import { 
    PieChart as RechartsPieChart, 
    Cell, 
    Pie,
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    LineChart, 
    Line, 
    ResponsiveContainer 
} from 'recharts';

// Types
interface ErrorJournal {
    id_primary_key: string;
    user_id_for_journal: string;
    problem_id: string | null;
    mistake_note: string | null;
    logged_at: string | null;
    category: string | null;
}

interface ProblemDetails {
    unique_problem_id: string;
    problem: string | null;
    solution: string | null;
    answer: string | null;
    source: string | null;
    difficulty: string | null;
    question_type: string | null;
    topic: string | null;
    year: string | null;
    problem_number: string | null;
    dataset_origin: string | null;
    difficulty_1: string | null;
}

interface ErrorWithProblem extends ErrorJournal {
    Problems_DataBank?: ProblemDetails;
}

interface AnalyticsData {
    totalErrors: number;
    categoriesCount: number;
    mostProblematicCategory: string;
    recentErrorStreak: number;
    categoryDistribution: Array<{ name: string; value: number; color: string }>;
    topicBreakdown: Array<{ topic: string; count: number; percentage: number }>;
    difficultyAnalysis: Array<{ difficulty: string; count: number }>;
    timelineTrends: Array<{ date: string; count: number }>;
    recommendations: Array<{
        type: 'strength' | 'weakness';
        topic: string;
        message: string;
        actionable: string;
    }>;
}

const CATEGORY_COLORS = [
    '#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', 
    '#EF4444', '#06B6D4', '#84CC16', '#F97316'
];

export default function ErrorAnalyticsPage() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
    const [errorJournals, setErrorJournals] = useState<ErrorWithProblem[]>([]);
    const [filteredErrors, setFilteredErrors] = useState<ErrorWithProblem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [selectedTopic, setSelectedTopic] = useState<string>('all');
    const [selectedDetailError, setSelectedDetailError] = useState<ErrorWithProblem | null>(null);
    const [mounted, setMounted] = useState(false);
    
    const auth = getAuth();
    const navigate = useNavigate();

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
            fetchErrorJournals();
        }
    }, [user]);

    useEffect(() => {
        filterErrors();
    }, [errorJournals, searchTerm, selectedCategory, selectedTopic]);

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
    

    const getSupabaseToken = async (): Promise<string> => {
        if (!user) throw new Error('No Firebase user signed in');
        const idToken = await user.getIdToken(true);
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
        
        const response = await fetch(`${supabaseUrl}/functions/v1/session-auth`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Edge function failed: ${errorData.error}`);
        }

        const data = await response.json();
        return data.access_token;
    };

    const fetchErrorJournals = async () => {
        try {
            setLoading(true);
            const token = await getSupabaseToken();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            // Fetch error journals with problem details
            const response = await fetch(
                `${supabaseUrl}/rest/v1/error_journal?user_id_for_journal=eq.${user?.uid}&select=*,Problems_DataBank(*)&order=logged_at.desc`, 
                {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': anonKey,
                        'Content-Type': 'application/json',
                    }
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch error journals: ${response.status}`);
            }

            const data = await response.json();
            
            // Transform the data to match our interface
            const transformedData: ErrorWithProblem[] = data.map((item: any) => ({
                id_primary_key: item.id_primary_key,
                user_id_for_journal: item.user_id_for_journal,
                problem_id: item.problem_id,
                mistake_note: item.mistake_note,
                logged_at: item.logged_at,
                category: item.category,
                Problems_DataBank: item.Problems_DataBank || undefined
            }));

            setErrorJournals(transformedData);
            generateAnalytics(transformedData);
        } catch (error) {
            console.error('Error fetching error journals:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateAnalytics = (errors: ErrorWithProblem[]) => {
        // Category distribution
        const categoryCount = errors.reduce((acc, error) => {
            const category = error.category || 'Uncategorized';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const categoryDistribution = Object.entries(categoryCount).map(([name, value], index) => ({
            name,
            value,
            color: CATEGORY_COLORS[index % CATEGORY_COLORS.length]
        }));

        // Topic breakdown (from problems)
        const topicCount = errors.reduce((acc, error) => {
            const topic = error.Problems_DataBank?.topic || 'Unknown';
            acc[topic] = (acc[topic] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const totalTopicErrors = Object.values(topicCount).reduce((a, b) => a + b, 0);
        const topicBreakdown = Object.entries(topicCount)
            .map(([topic, count]) => ({
                topic,
                count,
                percentage: totalTopicErrors > 0 ? Math.round((count / totalTopicErrors) * 100) : 0
            }))
            .sort((a, b) => b.count - a.count);

        // Difficulty analysis - handle both difficulty fields
        const difficultyCount = errors.reduce((acc, error) => {
            const difficulty = error.Problems_DataBank?.difficulty || 
                              error.Problems_DataBank?.difficulty_1 || 
                              'Unknown';
            acc[difficulty] = (acc[difficulty] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const difficultyAnalysis = Object.entries(difficultyCount).map(([difficulty, count]) => ({
            difficulty,
            count
        }));

        // Timeline trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
        
        const timelineTrends = Array.from({ length: 30 }, (_, i) => {
            const date = new Date(thirtyDaysAgo);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            
            const count = errors.filter(error => 
                error.logged_at && 
                error.logged_at.startsWith(dateStr)
            ).length;

            return {
                date: dateStr,
                count
            };
        });

        // Generate recommendations
        const recommendations = generateRecommendations(topicBreakdown, categoryDistribution);

        // Calculate streak (days since last error)
        const lastError = errors.find(e => e.logged_at);
        const daysSinceLastError = lastError 
            ? Math.floor((Date.now() - new Date(lastError.logged_at!).getTime()) / (1000 * 60 * 60 * 24))
            : 0;

        const analytics: AnalyticsData = {
            totalErrors: errors.length,
            categoriesCount: Object.keys(categoryCount).length,
            mostProblematicCategory: categoryDistribution.length > 0 
                ? categoryDistribution.sort((a, b) => b.value - a.value)[0].name 
                : 'None',
            recentErrorStreak: daysSinceLastError,
            categoryDistribution,
            topicBreakdown,
            difficultyAnalysis,
            timelineTrends,
            recommendations
        };

        setAnalyticsData(analytics);
    };

    const generateRecommendations = (
        topics: Array<{ topic: string; count: number; percentage: number }>,
        categories: Array<{ name: string; value: number }>
    ) => {
        const recommendations = [];

        // Find strongest topics (lowest error count, excluding 'Unknown')
        const knownTopics = topics.filter(t => t.topic !== 'Unknown');
        const strongTopics = knownTopics.filter(t => t.count <= 2);
        if (strongTopics.length > 0) {
            recommendations.push({
                type: 'strength' as const,
                topic: strongTopics[0].topic,
                message: `You're performing well in ${strongTopics[0].topic}`,
                actionable: `Practice more advanced ${strongTopics[0].topic} problems to build confidence`
            });
        }

        // Find problematic topics (highest error count)
        const weakTopics = knownTopics.slice(0, 2);
        weakTopics.forEach(topic => {
            if (topic.topic !== 'Unknown') {
                recommendations.push({
                    type: 'weakness' as const,
                    topic: topic.topic,
                    message: `${topic.topic} needs attention (${topic.count} errors)`,
                    actionable: `Focus on fundamental ${topic.topic} concepts and practice basic problems`
                });
            }
        });

        // Category-based recommendations
        const topCategory = categories[0];
        if (topCategory && topCategory.value > 3 && topCategory.name !== 'Uncategorized') {
            recommendations.push({
                type: 'weakness' as const,
                topic: topCategory.name,
                message: `${topCategory.name} is your most common mistake type`,
                actionable: `Review your approach and practice problems that specifically target ${topCategory.name}`
            });
        }

        return recommendations.slice(0, 4); // Limit to 4 recommendations
    };

    const filterErrors = () => {
        let filtered = [...errorJournals];

        if (searchTerm) {
            filtered = filtered.filter(error => 
                error.mistake_note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                error.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                error.Problems_DataBank?.topic?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedCategory !== 'all') {
            filtered = filtered.filter(error => error.category === selectedCategory);
        }

        if (selectedTopic !== 'all') {
            filtered = filtered.filter(error => error.Problems_DataBank?.topic === selectedTopic);
        }

        setFilteredErrors(filtered);
    };

    const getUniqueCategories = () => {
        const categories = errorJournals.map(e => e.category).filter((cat): cat is string => cat !== null);
        return Array.from(new Set(categories));
    };

    const getUniqueTopics = () => {
        const topics = errorJournals.map(e => e.Problems_DataBank?.topic).filter((topic): topic is string => topic !== null && topic !== undefined);
        return Array.from(new Set(topics));
    };

    if (loading || !analyticsData) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-slate-900">
                <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700"></div>
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-500 border-t-transparent absolute top-0 left-0"></div>
                    </div>
                    <p className="text-slate-300 font-medium animate-pulse bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg">
                        Analyzing error journals...
                    </p>
                </div>
            </div>
        );
    }

    const stats = [
        {
            title: "Total Error Journals",
            value: analyticsData.totalErrors.toString(),
            change: `${analyticsData.categoriesCount} categories`,
            changeText: "tracked",
            icon: BookMarked,
            color: "text-red-400",
            bgColor: "bg-red-500/10",
            borderColor: "border-red-500/20",
        },
        {
            title: "Most Problematic Topic",
            value: analyticsData.topicBreakdown[0]?.topic || 'N/A',
            change: `${analyticsData.topicBreakdown[0]?.count || 0} errors`,
            changeText: "recorded",
            icon: AlertTriangle,
            color: "text-orange-400",
            bgColor: "bg-orange-500/10",
            borderColor: "border-orange-500/20",
        },
        {
            title: "Error-Free Streak",
            value: `${analyticsData.recentErrorStreak} days`,
            change: analyticsData.recentErrorStreak > 7 ? "Great!" : "Keep going",
            changeText: "since last error",
            icon: Target,
            color: "text-emerald-400",
            bgColor: "bg-emerald-500/10",
            borderColor: "border-emerald-500/20",
        },
        {
            title: "Common Mistake Type",
            value: analyticsData.mostProblematicCategory,
            change: `${analyticsData.categoryDistribution.find(c => c.name === analyticsData.mostProblematicCategory)?.value || 0}`,
            changeText: "occurrences",
            icon: Brain,
            color: "text-purple-400",
            bgColor: "bg-purple-500/10",
            borderColor: "border-purple-500/20",
        }
    ];

    return (
        <div className="min-h-screen bg-slate-900 p-6 space-y-6">
            {/* Header */}
            <div className={`${mounted ? 'animate-in slide-in-from-top-4 fade-in duration-700' : ''}`}>
                <Breadcrumb className="mb-4">
                    <BreadcrumbList>
                        <BreadcrumbItem>
                            <BreadcrumbLink 
                                href="/dashboard" 
                                className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                                onClick={(e) => { e.preventDefault(); navigate('/dashboard'); }}
                            >
                                Dashboard
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="text-slate-600" />
                        <BreadcrumbItem>
                            <BreadcrumbLink href="#" className="text-slate-400 hover:text-white transition-colors">
                                Progress
                            </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator className="text-slate-600" />
                        <BreadcrumbItem>
                            <BreadcrumbPage className="text-white font-medium">Error Journal Analytics</BreadcrumbPage>
                        </BreadcrumbItem>
                    </BreadcrumbList>
                </Breadcrumb>

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">Error Journal Analytics</h1>
                        <p className="text-slate-400">
                            Analyze your mistake patterns and get personalized recommendations for improvement
                        </p>
                    </div>
                    <div className="p-3 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg">
                        <BookMarked className="h-6 w-6 text-white" />
                    </div>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat, index) => (
                    <Card 
                        key={index} 
                        className={`bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 hover:scale-105 ${mounted ? 'animate-in slide-in-from-bottom-4 fade-in' : ''}`} 
                        style={{ animationDelay: `${index * 150}ms` }}
                    >
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                            <CardTitle className="text-sm font-medium text-slate-400">
                                {stat.title}
                            </CardTitle>
                            <div className={`p-2 rounded-lg ${stat.bgColor} border ${stat.borderColor}`}>
                                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <div className="text-2xl font-bold text-white">
                                {stat.value}
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-1">
                                    <span className="text-xs font-medium text-slate-300">{stat.change}</span>
                                </div>
                                <p className="text-xs text-slate-500">{stat.changeText}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Charts Section */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Category Distribution */}
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-white">
                                <PieChart className="h-5 w-5 text-purple-400" />
                                Error Category Distribution
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Breakdown of your error types and patterns
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <RechartsPieChart>
                                        <Pie
                                            data={analyticsData.categoryDistribution}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={80}
                                            dataKey="value"
                                        >
                                            {analyticsData.categoryDistribution.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#1e293b', 
                                                border: '1px solid #475569',
                                                borderRadius: '8px',
                                                color: '#f8fafc'
                                            }} 
                                        />
                                    </RechartsPieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="grid grid-cols-2 gap-2 mt-4">
                                {analyticsData.categoryDistribution.map((category, index) => (
                                    <div key={index} className="flex items-center gap-2 text-xs">
                                        <div 
                                            className="w-3 h-3 rounded-full" 
                                            style={{ backgroundColor: category.color }}
                                        ></div>
                                        <span className="text-slate-300 truncate">{category.name}</span>
                                        <span className="text-slate-500">({category.value})</span>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Timeline Trends */}
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-white">
                                <Activity className="h-5 w-5 text-blue-400" />
                                Error Frequency Trends
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Your error patterns over the last 30 days
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={analyticsData.timelineTrends}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                        <XAxis 
                                            dataKey="date" 
                                            stroke="#9ca3af"
                                            fontSize={12}
                                            tickFormatter={(value) => new Date(value).getDate().toString()}
                                        />
                                        <YAxis stroke="#9ca3af" fontSize={12} />
                                        <Tooltip 
                                            contentStyle={{ 
                                                backgroundColor: '#1e293b', 
                                                border: '1px solid #475569',
                                                borderRadius: '8px',
                                                color: '#f8fafc'
                                            }}
                                            labelFormatter={(value) => `Date: ${new Date(value).toLocaleDateString()}`}
                                        />
                                        <Line 
                                            type="monotone" 
                                            dataKey="count" 
                                            stroke="#3b82f6" 
                                            strokeWidth={2}
                                            dot={{ fill: '#3b82f6', r: 4 }}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Recommendations Sidebar */}
                <div className="space-y-6">
                    {/* Recommendations */}
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-white">
                                <Lightbulb className="h-5 w-5 text-yellow-400" />
                                Recommendations
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                Personalized practice suggestions
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {analyticsData.recommendations.map((rec, index) => (
                                <div 
                                    key={index} 
                                    className={`p-3 rounded-lg border ${
                                        rec.type === 'strength' 
                                            ? 'bg-emerald-500/10 border-emerald-500/20' 
                                            : 'bg-orange-500/10 border-orange-500/20'
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`p-1 rounded ${
                                            rec.type === 'strength' ? 'bg-emerald-500/20' : 'bg-orange-500/20'
                                        }`}>
                                            {rec.type === 'strength' ? 
                                                <CheckCircle className="h-4 w-4 text-emerald-400" /> :
                                                <AlertTriangle className="h-4 w-4 text-orange-400" />
                                            }
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            <p className="text-sm font-medium text-white">
                                                {rec.message}
                                            </p>
                                            <p className="text-xs text-slate-400">
                                                {rec.actionable}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {analyticsData.recommendations.length === 0 && (
                                <div className="text-center py-8 text-slate-400">
                                    <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No recommendations yet</p>
                                    <p className="text-xs">Create more error journals to get personalized insights</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Topic Breakdown */}
                    <Card className="bg-slate-800/50 border-slate-700/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-3 text-white">
                                <BarChart3 className="h-5 w-5 text-green-400" />
                                Topic Breakdown
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {analyticsData.topicBreakdown.slice(0, 5).map((topic, index) => (
                                <div key={index} className="space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-300">{topic.topic}</span>
                                        <span className="text-slate-400">{topic.count} errors</span>
                                    </div>
                                    <div className="w-full bg-slate-700 rounded-full h-2">
                                        <div 
                                            className="bg-gradient-to-r from-green-500 to-emerald-600 h-2 rounded-full transition-all duration-500"
                                            style={{ width: `${topic.percentage}%` }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Error Journals Table */}
            <Card className="bg-slate-800/50 border-slate-700/50">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <CardTitle className="flex items-center gap-3 text-white">
                                <BookMarked className="h-5 w-5 text-blue-400" />
                                Error Journal Entries
                            </CardTitle>
                            <CardDescription className="text-slate-400">
                                All your recorded mistakes and reflections
                            </CardDescription>
                        </div>
                        <div className="text-sm text-slate-400">
                            {filteredErrors.length} of {errorJournals.length} entries
                        </div>
                    </div>
                    
                    {/* Filters */}
                    <div className="flex gap-4 pt-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                            <input
                                type="text"
                                placeholder="Search mistake notes..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 w-full border border-slate-700 rounded-lg bg-slate-800/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
                            />
                        </div>
                        
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-3 py-2 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        >
                            <option value="all">All Categories</option>
                            {getUniqueCategories().map(category => (
                                <option key={category} value={category}>{category}</option>
                            ))}
                        </select>
                        
                        <select
                            value={selectedTopic}
                            onChange={(e) => setSelectedTopic(e.target.value)}
                            className="px-3 py-2 border border-slate-700 rounded-lg bg-slate-800/50 text-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                        >
                            <option value="all">All Topics</option>
                            {getUniqueTopics().map(topic => (
                                <option key={topic} value={topic}>{topic}</option>
                            ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {filteredErrors.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p className="text-lg font-medium mb-2">No error journals found</p>
                                <p className="text-sm">
                                    {searchTerm || selectedCategory !== 'all' || selectedTopic !== 'all' 
                                        ? 'Try adjusting your filters or search terms'
                                        : 'Start tracking your mistakes to get personalized analytics'
                                    }
                                </p>
                            </div>
                        ) : (
                            filteredErrors.map((error, index) => (
                                <div 
                                    key={error.id_primary_key}
                                    className={`group p-4 bg-slate-900/50 border border-slate-700/50 rounded-lg hover:bg-slate-800/50 hover:border-slate-600/50 transition-all duration-200 cursor-pointer ${mounted ? 'animate-in slide-in-from-bottom-2 fade-in' : ''}`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                    onClick={() => setSelectedDetailError(error)}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                {error.category && (
                                                    <span className="px-2 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded text-xs font-medium">
                                                        {error.category}
                                                    </span>
                                                )}
                                                {error.Problems_DataBank?.topic && (
                                                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-xs font-medium">
                                                        {error.Problems_DataBank.topic}
                                                    </span>
                                                )}
                                                {(error.Problems_DataBank?.difficulty || error.Problems_DataBank?.difficulty_1) && (
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        (error.Problems_DataBank?.difficulty || error.Problems_DataBank?.difficulty_1) === 'Easy' 
                                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                                            : (error.Problems_DataBank?.difficulty || error.Problems_DataBank?.difficulty_1) === 'Medium'
                                                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                                    }`}>
                                                        {error.Problems_DataBank?.difficulty || error.Problems_DataBank?.difficulty_1}
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <p className="text-sm text-slate-300 line-clamp-2 group-hover:text-white transition-colors">
                                                {error.mistake_note || 'No mistake note provided'}
                                            </p>
                                            
                                            <div className="flex items-center gap-4 text-xs text-slate-500">
                                                <div className="flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {error.logged_at ? new Date(error.logged_at).toLocaleDateString() : 'No date'}
                                                </div>
                                                {error.Problems_DataBank?.source && (
                                                    <div className="flex items-center gap-1">
                                                        <BookMarked className="h-3 w-3" />
                                                        {error.Problems_DataBank.source}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <button 
                                                className="p-2 hover:bg-slate-700/50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedDetailError(error);
                                                }}
                                            >
                                                <Eye className="h-4 w-4 text-slate-400" />
                                            </button>
                                            <ChevronDown className="h-4 w-4 text-slate-400 group-hover:text-slate-300 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Load More Button (if you want to implement pagination later) */}
                    {filteredErrors.length > 0 && filteredErrors.length < errorJournals.length && (
                        <div className="text-center pt-6">
                            <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors text-sm font-medium">
                                Load More Entries
                            </button>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Error Detail Modal */}
            {selectedDetailError && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900 rounded-2xl border border-slate-700/50 shadow-2xl overflow-hidden">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-slate-800/50 bg-slate-900/95 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg">
                                    <AlertTriangle className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Error Journal Entry</h2>
                                    <p className="text-sm text-slate-400">
                                        Logged on {selectedDetailError.logged_at ? new Date(selectedDetailError.logged_at).toLocaleDateString() : 'Unknown date'}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedDetailError(null)}
                                className="p-2 hover:bg-slate-800/50 rounded-lg transition-colors group"
                            >
                                <XCircle className="h-5 w-5 text-slate-400 group-hover:text-white" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="overflow-auto max-h-[calc(90vh-80px)] p-6 space-y-6">
                            {/* Categories and Tags */}
                            <div className="flex flex-wrap gap-2">
                                {selectedDetailError.category && (
                                    <span className="px-3 py-1 bg-red-500/20 text-red-300 border border-red-500/30 rounded-full text-sm font-medium">
                                        {selectedDetailError.category}
                                    </span>
                                )}
                                {selectedDetailError.Problems_DataBank?.topic && (
                                    <span className="px-3 py-1 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-full text-sm font-medium">
                                        {selectedDetailError.Problems_DataBank.topic}
                                    </span>
                                )}
                                {(selectedDetailError.Problems_DataBank?.difficulty || selectedDetailError.Problems_DataBank?.difficulty_1) && (
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                                        (selectedDetailError.Problems_DataBank?.difficulty || selectedDetailError.Problems_DataBank?.difficulty_1) === 'Easy' 
                                            ? 'bg-green-500/20 text-green-300 border border-green-500/30'
                                            : (selectedDetailError.Problems_DataBank?.difficulty || selectedDetailError.Problems_DataBank?.difficulty_1) === 'Medium'
                                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                                    }`}>
                                        Difficulty: {selectedDetailError.Problems_DataBank?.difficulty || selectedDetailError.Problems_DataBank?.difficulty_1}
                                    </span>
                                )}
                            </div>

                            {/* Mistake Note */}
                            <div className="space-y-2">
                                <h3 className="text-lg font-semibold text-white">Mistake Reflection</h3>
                                <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                                    <p className="text-slate-300 whitespace-pre-wrap leading-relaxed">
                                        {selectedDetailError.mistake_note || 'No mistake note provided'}
                                    </p>
                                </div>
                            </div>

                            {/* Problem Details */}
                            {selectedDetailError.Problems_DataBank && (
                                <div className="space-y-2">
                                    <h3 className="text-lg font-semibold text-white">Associated Problem</h3>
                                    <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg space-y-3">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-400">Source:</span>
                                            <span className="text-slate-300">{selectedDetailError.Problems_DataBank.source || 'Unknown'}</span>
                                        </div>
                                        
                                        {selectedDetailError.Problems_DataBank.problem && (
                                            <div className="space-y-1">
                                                <span className="text-slate-400 text-sm">Problem Statement:</span>
                                                <div className="p-3 bg-slate-900/50 rounded border border-slate-700/30">
                                                    <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                                        {selectedDetailError.Problems_DataBank.problem.length > 500 
                                                            ? selectedDetailError.Problems_DataBank.problem.substring(0, 500) + '...'
                                                            : selectedDetailError.Problems_DataBank.problem
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {/* Additional Problem Details */}
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {selectedDetailError.Problems_DataBank.year && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400">Year:</span>
                                                    <span className="text-slate-300">{selectedDetailError.Problems_DataBank.year}</span>
                                                </div>
                                            )}
                                            {selectedDetailError.Problems_DataBank.problem_number && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400">Problem #:</span>
                                                    <span className="text-slate-300">{selectedDetailError.Problems_DataBank.problem_number}</span>
                                                </div>
                                            )}
                                            {selectedDetailError.Problems_DataBank.question_type && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400">Type:</span>
                                                    <span className="text-slate-300">{selectedDetailError.Problems_DataBank.question_type}</span>
                                                </div>
                                            )}
                                            {selectedDetailError.Problems_DataBank.dataset_origin && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-slate-400">Dataset:</span>
                                                    <span className="text-slate-300">{selectedDetailError.Problems_DataBank.dataset_origin}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-4 border-t border-slate-800/50">
                                {/* <button 
                                    className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium"
                                    onClick={() => {
                                        // Here you could implement "Practice Similar Problems" functionality
                                        console.log('Practice similar problems for:', selectedDetailError.Problems_DataBank?.topic);
                                        setSelectedDetailError(null);
                                    }}
                                >
                                    Practice Similar Problems
                                </button> */}
                                <button 
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors font-medium"
                                    onClick={() => setSelectedDetailError(null)}
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}