import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
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
  BarChart, Bar, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
  Legend, ComposedChart, Scatter
} from 'recharts';
import {
  TrendingUp, Target, Brain, Clock, Award, Zap, BookOpen,
  BarChart3, Activity, Calendar, ChevronRight, AlertTriangle,
  CheckCircle, Timer, Layers, Trophy, Flame, ArrowUp, ArrowDown,
  Lightbulb, RefreshCw, ChevronDown
} from 'lucide-react';

interface ProblemStats {
  user_id: string;
  total_problems_solved: number;
  daily_problems_solved: number;
  weekly_problems_solved: number;
  monthly_problems_solved: number;
  total_attempts: number;
  correct_attempts: number;
  average_accuracy: number;
  last_problem_solved?: Date | string | null;
  last_daily_reset?: Date | string | null;
  problems_by_topic: Record<string, {
    solved: number;
    attempts: number;
    accuracy: number;
    difficulty_breakdown?: Record<string, number>;
    sources?: Record<string, {
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
  problem_timings_record?: Record<string, {
    date: string;
    problems_solved: string[];
    total_solved: number;
    total_attempts: number;
    accuracy: number;
    total_time_spent: number;
    average_time_per_problem: number;
  }>;
}

export default function ProblemAnalyticsDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ProblemStats | null>(null);
  const [mounted, setMounted] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState('week');
  const [past30DaysData, setPast30DaysData] = useState<Array<{date: string; solved: number; attempts: number; accuracy: number}>>([]);
  const [distributionView, setDistributionView] = useState<'overview' | 'byDifficulty' | 'byTime' | 'accuracy'|'bySource'>('overview');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [isFirstDropdownOpen, setIsFirstDropdownOpen] = useState(false);
  const [isSecondDropdownOpen, setIsSecondDropdownOpen] = useState(false);
  const [secondDistributionView, setSecondDistributionView] = useState<'overview' | 'byDifficulty' | 'byTime' | 'accuracy'>('overview');
  
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
      fetchProblemStats();
    }
  }, [user]);

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

  const fetchProblemStats = async () => {
    try {
      setLoading(true);
      const token = await getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const response = await fetch(
        `${supabaseUrl}/rest/v1/user_problem_data?user_id=eq.${user?.uid}&select=*`,
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
        throw new Error(`Failed to fetch problem stats: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.length > 0) {
        const dbStats = data[0];
        setStats({
          user_id: dbStats.user_id,
          total_problems_solved: dbStats.total_problems_solved || 0,
          daily_problems_solved: dbStats.daily_problems_solved || 0,
          weekly_problems_solved: dbStats.weekly_problems_solved || 0,
          monthly_problems_solved: dbStats.monthly_problems_solved || 0,
          total_attempts: dbStats.total_attempts || 0,
          correct_attempts: dbStats.correct_attempts || 0,
          average_accuracy: parseFloat(dbStats.average_accuracy || '0'),
          last_problem_solved: dbStats.last_problem_solved,
          last_daily_reset: dbStats.last_daily_reset,
          problems_by_topic: dbStats.problems_by_topic || {},
          difficulty_stats: dbStats.difficulty_stats || {},
          problem_timings_record: dbStats.problem_timings_record || {}
        });

        // Generate past 30 days data
        generatePast30DaysData(dbStats.problem_timings_record || {});
      }
    } catch (error) {
      console.error('Error fetching problem stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePast30DaysData = (timingRecords: Record<string, any>) => {
    const data = [];
    const today = new Date();
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const record = timingRecords[dateStr];
      data.push({
        date: dateStr,
        solved: record?.total_solved || 0,
        attempts: record?.total_attempts || 0,
        accuracy: record?.accuracy || 0,
        averageTime: record?.average_time_per_problem || 0
      });
    }
    
    setPast30DaysData(data);
  };

  // Calculate timing insights
  const getTimingInsights = () => {
    if (!stats?.problem_timings_record) {
      return {
        averageTimePerProblem: 0,
        totalTimeSpent: 0,
        mostProductiveDay: null,
        recentPerformanceTrend: 'stable'
      };
    }

    const records = Object.values(stats.problem_timings_record);
    const totalTime = records.reduce((sum: number, record: any) => sum + (record.total_time_spent || 0), 0);
    const totalSolved = records.reduce((sum: number, record: any) => sum + (record.total_solved || 0), 0);
    const avgTime = totalSolved > 0 ? totalTime / totalSolved : 0;

    let mostProductiveDay = null;
    let maxSolved = 0;
    records.forEach((record: any) => {
      if (record.total_solved > maxSolved) {
        maxSolved = record.total_solved;
        mostProductiveDay = record.date;
      }
    });

    // Analyze recent trend
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentWeek = records.filter((r: any) => {
      const recordDate = new Date(r.date);
      return recordDate >= sevenDaysAgo;
    });
    const previousWeek = records.filter((r: any) => {
      const recordDate = new Date(r.date);
      return recordDate >= fourteenDaysAgo && recordDate < sevenDaysAgo;
    });

    const recentAvgAccuracy = recentWeek.length > 0 ? 
      recentWeek.reduce((sum: number, r: any) => sum + r.accuracy, 0) / recentWeek.length : 0;
    const previousAvgAccuracy = previousWeek.length > 0 ? 
      previousWeek.reduce((sum: number, r: any) => sum + r.accuracy, 0) / previousWeek.length : 0;

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
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get chart data based on selected view
  const getDistributionChartData = () => {
    if (!stats) return [];

    const topicData = Object.entries(stats.problems_by_topic);

    if (distributionView === 'overview') {
      return topicData.map(([topic, data]) => ({
        name: topic,
        solved: data.solved,
        accuracy: data.accuracy,
        attempts: data.attempts
      }));
    } else if (distributionView === 'byDifficulty') {
      if (selectedTopic === 'all') {
        // Show overall difficulty distribution
        return Object.entries(stats.difficulty_stats).map(([level, data]) => ({
          name: `Level ${level}`,
          solved: data.solved,
          accuracy: data.accuracy,
          attempts: data.attempts
        }));
      } else {
        // Show difficulty breakdown for selected topic
        const topicInfo = stats.problems_by_topic[selectedTopic];
        if (!topicInfo?.difficulty_breakdown) return [];
        return Object.entries(topicInfo.difficulty_breakdown).map(([level, count]) => ({
          name: `Level ${level}`,
          solved: count,
          accuracy: topicInfo.accuracy,
          attempts: Math.round(count * (100 / topicInfo.accuracy))
        }));
      }
    } else if (distributionView === 'byTime') {
  // Calculate actual average time per topic from timing records
  const timingRecords = Object.values(stats.problem_timings_record || {});
  const topicTimeMap: Record<string, { totalTime: number; count: number }> = {};
  
  // Calculate actual average time from timing records
  timingRecords.forEach((record: any) => {
    if (record.average_time_per_problem && record.total_solved > 0) {
      topicData.forEach(([topic, data]) => {
        if (!topicTimeMap[topic]) {
          topicTimeMap[topic] = { totalTime: 0, count: 0 };
        }
        // Distribute the average time proportionally based on problems solved
        const topicPortion = data.solved / stats.total_problems_solved;
        topicTimeMap[topic].totalTime += record.average_time_per_problem * topicPortion;
        topicTimeMap[topic].count += topicPortion;
      });
    }
  });

  return Object.entries(topicTimeMap).map(([topic, data]) => ({
    name: topic,
    avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
    solved: stats.problems_by_topic[topic].solved,
    timePerProblem: data.count > 0 ? Math.round(data.totalTime / data.count) : 0
  }));

    } else if (distributionView === 'bySource') {
  // New source analysis
  const sourceData: Record<string, { solved: number; attempts: number; accuracy: number }> = {};
  
  topicData.forEach(([topic, data]) => {
    if (data.sources) {
      Object.entries(data.sources).forEach(([source, sourceStats]) => {
        if (!sourceData[source]) {
          sourceData[source] = { solved: 0, attempts: 0, accuracy: 0 };
        }
        sourceData[source].solved += sourceStats.solved;
        sourceData[source].attempts += sourceStats.attempts;
      });
    }
  });

  // Calculate average accuracy for each source
  Object.keys(sourceData).forEach(source => {
    if (sourceData[source].attempts > 0) {
      sourceData[source].accuracy = (sourceData[source].solved / sourceData[source].attempts) * 100;
    }
  });

  return Object.entries(sourceData).map(([source, data]) => ({
    name: source,
    solved: data.solved,
    accuracy: data.accuracy,
    attempts: data.attempts
  }));
} else if (distributionView === 'accuracy') {
    return topicData
      .map(([topic, data]) => ({
        name: topic,
        accuracy: data.accuracy,
        solved: data.solved,
          incorrect: data.attempts - data.solved
        }))
        .sort((a, b) => b.accuracy - a.accuracy);
    }

    return [];
  };

  const getSecondChartData = () => {
  if (!stats) return [];

  const topicData = Object.entries(stats.problems_by_topic);

  if (secondDistributionView === 'overview') {
    return topicData.map(([topic, data]) => ({
      name: topic,
      solved: data.solved,
      accuracy: data.accuracy,
      attempts: data.attempts
    }));
  } else if (secondDistributionView === 'byDifficulty') {
    if (selectedTopic === 'all') {
      // Show overall difficulty distribution
      return Object.entries(stats.difficulty_stats).map(([level, data]) => ({
        name: `Level ${level}`,
        solved: data.solved,
        accuracy: data.accuracy,
        attempts: data.attempts
      }));
    } else {
      // Show difficulty breakdown for selected topic
      const topicInfo = stats.problems_by_topic[selectedTopic];
      if (!topicInfo?.difficulty_breakdown) return [];
      return Object.entries(topicInfo.difficulty_breakdown).map(([level, count]) => ({
        name: `Level ${level}`,
        solved: count,
        accuracy: topicInfo.accuracy,
        attempts: Math.round(count * (100 / topicInfo.accuracy))
      }));
    }
  } else if (secondDistributionView === 'byTime') {
    // Calculate actual average time per topic from timing records
    const timingRecords = Object.values(stats.problem_timings_record || {});
    const topicTimeMap: Record<string, { totalTime: number; count: number }> = {};
    
    // Calculate actual average time from timing records
    timingRecords.forEach((record: any) => {
      if (record.average_time_per_problem && record.total_solved > 0) {
        topicData.forEach(([topic, data]) => {
          if (!topicTimeMap[topic]) {
            topicTimeMap[topic] = { totalTime: 0, count: 0 };
          }
          // Distribute the average time proportionally based on problems solved
          const topicPortion = data.solved / stats.total_problems_solved;
          topicTimeMap[topic].totalTime += record.average_time_per_problem * topicPortion;
          topicTimeMap[topic].count += topicPortion;
        });
      }
    });

    return Object.entries(topicTimeMap).map(([topic, data]) => ({
      name: topic,
      avgTime: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      solved: stats.problems_by_topic[topic].solved,
      timePerProblem: data.count > 0 ? Math.round(data.totalTime / data.count) : 0
    }));
  } else if (secondDistributionView === 'accuracy') {
    return topicData
      .map(([topic, data]) => ({
        name: topic,
        accuracy: data.accuracy,
        solved: data.solved,
        incorrect: data.attempts - data.solved
      }))
      .sort((a, b) => b.accuracy - a.accuracy);
  }

  return [];
};

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-700"></div>
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
          </div>
          <p className="text-slate-300 font-medium animate-pulse bg-slate-800/80 backdrop-blur-sm px-4 py-2 rounded-lg">
            Loading problem analytics...
          </p>
        </div>
      </div>
    );
  }

  const timingInsights = getTimingInsights();

  // Prepare chart data
  const topicData = Object.entries(stats.problems_by_topic)
    .map(([topic, data]) => ({
      topic,
      solved: data.solved,
      accuracy: data.accuracy,
      attempts: data.attempts
    }))
    .sort((a, b) => b.solved - a.solved);

  // Generate recommendations
  const generateRecommendations = () => {
    const recs = [];
    
    // Find strongest topic
    const strongestTopic = topicData.find(t => t.accuracy > 85);
    if (strongestTopic) {
      recs.push({
        type: 'strength',
        topic: strongestTopic.topic,
        message: `You're performing well in ${strongestTopic.topic}`,
        actionable: `Practice more advanced ${strongestTopic.topic} problems to build confidence`
      });
    }

    // Find weakest topic
    const weakestTopic = topicData.find(t => t.accuracy < 70 && t.attempts > 5);
    if (weakestTopic) {
      recs.push({
        type: 'weakness',
        topic: weakestTopic.topic,
        message: `${weakestTopic.topic} needs attention (${weakestTopic.accuracy.toFixed(1)}% accuracy)`,
        actionable: `Focus on fundamental ${weakestTopic.topic} concepts and practice basic problems`
      });
    }

    return recs;
  };

  const recommendations = generateRecommendations();

  const statCards = [
    {
      title: "Daily Progress",
      value: `${stats.daily_problems_solved}/10`,
      change: stats.daily_problems_solved >= 10 ? "Goal reached!" : `${10 - stats.daily_problems_solved} to go`,
      changeText: "today",
      icon: Flame,
      color: "text-orange-400",
      bgColor: "bg-orange-500/10",
      borderColor: "border-orange-500/20"
    },
    {
      title: "Accuracy Rate",
      value: `${stats.average_accuracy.toFixed(1)}%`,
      change: stats.average_accuracy > 80 ? "Excellent" : "Keep practicing",
      changeText: "overall",
      icon: Target,
      color: "text-emerald-400",
      bgColor: "bg-emerald-500/10",
      borderColor: "border-emerald-500/20"
    }
  ];

  const chartData = getDistributionChartData();
  const secondChartData = getSecondChartData();

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
                Analytics
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="text-slate-600" />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-white font-medium">Problem Solving Analytics</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Problem Solving Analytics</h1>
            <p className="text-slate-400">
              Track your progress, identify strengths, and discover areas for improvement
            </p>
          </div>
          <button 
            onClick={() => fetchProblemStats()}
            className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200"
          >
            <RefreshCw className="h-6 w-6 text-white" />
          </button>
        </div>
      </div>

      {/* Stats Grid - Only 2 cards now */}
      <div className="grid gap-6 md:grid-cols-2">
        {statCards.map((stat, index) => (
          <Card 
            key={index} 
            className={`bg-slate-800/50 border-slate-700/50 hover:bg-slate-800/70 hover:border-slate-600/50 transition-all duration-300 hover:scale-105 ${
              mounted ? 'animate-in slide-in-from-bottom-4 fade-in' : ''
            }`} 
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
                <span className="text-xs font-medium text-slate-300">{stat.change}</span>
                <span className="text-xs text-slate-500">{stat.changeText}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Enhanced Topic Distribution with Dropdown */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <BarChart3 className="h-5 w-5 text-purple-400" />
                    Topic Analysis
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Explore your performance across different dimensions
                  </CardDescription>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsFirstDropdownOpen(!isFirstDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                  >
                    {distributionView === 'overview' && 'Overview'}
                    {distributionView === 'byDifficulty' && 'By Difficulty'}
                    {distributionView === 'bySource' && 'By Source'}
                    {distributionView === 'accuracy' && 'By Accuracy'}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  {isFirstDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                      <button
                        onClick={() => { setDistributionView('overview'); setIsFirstDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        Overview
                      </button>
                      <button
                        onClick={() => { setDistributionView('byDifficulty'); setIsFirstDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        By Difficulty
                      </button>
                      <button
                        onClick={() => { setDistributionView('bySource'); setIsFirstDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        By Source
                      </button>
                      <button
                        onClick={() => { setDistributionView('accuracy'); setIsFirstDropdownOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                      >
                        By Accuracy
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {distributionView === 'byDifficulty' && (
                <div className="mt-4">
                  <select
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                    className="px-3 py-1 bg-slate-700/50 border border-slate-600 rounded text-sm text-slate-300"
                  >
                    <option value="all">All Topics</option>
                    {topicData.map(topic => (
                      <option key={topic.topic} value={topic.topic}>{topic.topic}</option>
                    ))}
                  </select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {distributionView === 'overview' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }} 
                      />
                      <Bar dataKey="solved" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="attempts" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : distributionView === 'byDifficulty' ? (
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }} 
                      />
                      <Bar yAxisId="left" dataKey="solved" fill="#10B981" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#F59E0B" strokeWidth={2} dot={{ fill: '#F59E0B' }} />
                    </ComposedChart>
                  ) : distributionView === 'bySource' ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }} 
                      />
                      <Bar dataKey="solved" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="attempts" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  ) : (
                    <ComposedChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }} 
                      />
                      <Bar yAxisId="left" dataKey="solved" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                      <Bar yAxisId="left" dataKey="incorrect" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', r: 4 }} />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
              {distributionView === 'byDifficulty' && (
                <div className="mt-4 flex items-center justify-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-slate-400">Problems Solved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                    <span className="text-slate-400">Accuracy %</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress Timeline */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Activity className="h-5 w-5 text-blue-400" />
                Progress Timeline
              </CardTitle>
              <CardDescription className="text-slate-400">
                Your problem-solving activity over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={past30DaysData}>
                    <defs>
                      <linearGradient id="solvedGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="date" 
                      stroke="#9ca3af" 
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    />
                    <YAxis stroke="#9ca3af" fontSize={12} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1e293b', 
                        border: '1px solid #475569',
                        borderRadius: '8px',
                        color: '#f8fafc'
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="solved" 
                      stroke="#3B82F6" 
                      fillOpacity={1} 
                      fill="url(#solvedGradient)"
                      strokeWidth={2}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="accuracy" 
                      stroke="#10B981" 
                      strokeWidth={2}
                      dot={{ fill: '#10B981', r: 3 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 flex items-center justify-center gap-6 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-slate-400">Problems Solved</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span className="text-slate-400">Accuracy Rate</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Topic Distribution with Subject Correlation */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <CardTitle className="flex items-center gap-3 text-white">
                    <Layers className="h-5 w-5 text-purple-400" />
                    Subject Performance Analysis
                  </CardTitle>
                  <CardDescription className="text-slate-400">
                    Analyze performance patterns across subjects and correlate with difficulty/time
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <div className="relative">
                    <button
                      onClick={() => setIsSecondDropdownOpen(!isSecondDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                    >
                      {secondDistributionView === 'overview' && 'Subject Overview'}
                      {secondDistributionView === 'byDifficulty' && 'Difficulty Analysis'}
                      {secondDistributionView === 'byTime' && 'Time Analysis'}
                      {secondDistributionView === 'accuracy' && 'Accuracy Ranking'}
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    {isSecondDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-52 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-10">
                        <button
                          onClick={() => { setSecondDistributionView('overview'); setIsSecondDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors rounded-t-lg"
                        >
                          📊 Subject Overview
                        </button>
                        <button
                          onClick={() => { setSecondDistributionView('byDifficulty'); setIsSecondDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          🎯 Difficulty Analysis
                        </button>
                        <button
                          onClick={() => { setSecondDistributionView('byTime'); setIsSecondDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
                        >
                          ⏱️ Time Analysis
                        </button>
                        <button
                          onClick={() => { setSecondDistributionView('accuracy'); setIsSecondDropdownOpen(false); }}
                          className="w-full text-left px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 transition-colors rounded-b-lg"
                        >
                          🏆 Accuracy Ranking
                        </button>
                      </div>
                    )}
                  </div>
                  {distributionView === 'byDifficulty' && (
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-sm text-slate-300"
                    >
                      <option value="all">All Subjects</option>
                      {topicData.map(topic => (
                        <option key={topic.topic} value={topic.topic}>{topic.topic}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {secondDistributionView === 'overview' ? (
                    <ComposedChart data={secondChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }} 
                      />
                      <Bar yAxisId="left" dataKey="solved" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#10B981" strokeWidth={3} dot={{ fill: '#10B981', r: 4 }} />
                    </ComposedChart>
                  ) : secondDistributionView === 'byDifficulty' ? (
                    <ComposedChart data={secondChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis dataKey="name" stroke="#9ca3af" fontSize={12} />
                      <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }} 
                      />
                      <Bar yAxisId="left" dataKey="solved" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', r: 4 }} />
                      <Legend />
                    </ComposedChart>
                  ) : secondDistributionView === 'byTime' ? (
                    <ComposedChart data={secondChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'avgTime' || name === 'timePerProblem') {
                            return [`${value}s`, 'Avg Time per Problem'];
                          }
                          return [value, name];
                        }}
                      />
                      <Bar yAxisId="left" dataKey="solved" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="avgTime" stroke="#F97316" strokeWidth={3} dot={{ fill: '#F97316', r: 4 }} />
                    </ComposedChart>
                  ) : (
                    <ComposedChart data={secondChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#9ca3af"
                        fontSize={12}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis yAxisId="left" stroke="#9ca3af" fontSize={12} />
                      <YAxis yAxisId="right" orientation="right" stroke="#9ca3af" fontSize={12} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: '1px solid #475569',
                          borderRadius: '8px',
                          color: '#f8fafc'
                        }} 
                      />
                      <Bar yAxisId="left" dataKey="solved" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} />
                      <Bar yAxisId="left" dataKey="incorrect" stackId="a" fill="#EF4444" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="accuracy" stroke="#F59E0B" strokeWidth={3} dot={{ fill: '#F59E0B', r: 4 }} />
                    </ComposedChart>
                  )}
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                {secondDistributionView === 'overview' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      <span className="text-slate-400">Problems Solved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-slate-400">Accuracy Rate</span>
                    </div>
                  </>
                )}
                {secondDistributionView === 'byDifficulty' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-purple-500 rounded"></div>
                      <span className="text-slate-400">Problems Solved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-slate-400">Accuracy %</span>
                    </div>
                  </>
                )}
                {secondDistributionView === 'byTime' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-cyan-500 rounded"></div>
                      <span className="text-slate-400">Problems Solved</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-orange-500 rounded"></div>
                      <span className="text-slate-400">Avg Time (seconds)</span>
                    </div>
                  </>
                )}
                {secondDistributionView === 'accuracy' && (
                  <>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded"></div>
                      <span className="text-slate-400">Correct</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded"></div>
                      <span className="text-slate-400">Incorrect</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                      <span className="text-slate-400">Accuracy Trend</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Insights & Performance */}
        <div className="space-y-6">
          {/* Performance Insights */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Brain className="h-5 w-5 text-indigo-400" />
                Performance Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="flex items-center gap-3">
                    <Timer className="h-4 w-4 text-cyan-400" />
                    <span className="text-sm text-slate-300">Avg Time/Problem</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatTime(timingInsights.averageTimePerProblem)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-slate-300">Total Study Time</span>
                  </div>
                  <span className="text-white font-medium">
                    {formatTime(timingInsights.totalTimeSpent)}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-slate-300">Recent Trend</span>
                  </div>
                  <span className={`font-medium capitalize ${
                    timingInsights.recentPerformanceTrend === 'improving' ? 'text-green-400' :
                    timingInsights.recentPerformanceTrend === 'declining' ? 'text-red-400' :
                    'text-yellow-400'
                  }`}>
                    {timingInsights.recentPerformanceTrend}
                  </span>
                </div>

                {timingInsights.mostProductiveDay && (
                  <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="flex items-center gap-3">
                      <Trophy className="h-4 w-4 text-yellow-400" />
                      <span className="text-sm text-slate-300">Best Day</span>
                    </div>
                    <span className="text-white font-medium">
                      {new Date(timingInsights.mostProductiveDay).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Subject Mastery Breakdown */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <BookOpen className="h-5 w-5 text-green-400" />
                Subject Mastery
              </CardTitle>
              <CardDescription className="text-slate-400">
                Your progress in each subject area
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topicData.slice(0, 6).map((topic) => {
                  const masteryLevel = topic.accuracy > 90 ? 'Expert' : 
                                     topic.accuracy > 75 ? 'Proficient' : 
                                     topic.accuracy > 60 ? 'Developing' : 'Beginner';
                  const masteryColor = topic.accuracy > 90 ? 'text-purple-400' : 
                                     topic.accuracy > 75 ? 'text-green-400' : 
                                     topic.accuracy > 60 ? 'text-yellow-400' : 'text-red-400';
                  
                  return (
                    <div key={topic.topic} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-300">{topic.topic}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-medium ${masteryColor}`}>
                            {masteryLevel}
                          </span>
                          <span className="text-xs text-slate-500">
                            {topic.solved} solved
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-slate-700/50 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(topic.accuracy, 100)}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{topic.accuracy.toFixed(1)}% accuracy</span>
                        <span>{topic.attempts} attempts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Smart Recommendations */}
          <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Lightbulb className="h-5 w-5 text-yellow-400" />
                Smart Recommendations
              </CardTitle>
              <CardDescription className="text-slate-400">
                AI-powered insights to improve your learning
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recommendations.length > 0 ? (
                  recommendations.map((rec, index) => (
                    <div 
                      key={index}
                      className={`p-4 rounded-lg border ${
                        rec.type === 'strength' 
                          ? 'bg-green-500/10 border-green-500/20' 
                          : 'bg-yellow-500/10 border-yellow-500/20'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {rec.type === 'strength' ? (
                          <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-400 mt-0.5" />
                        )}
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-white">
                            {rec.message}
                          </p>
                          <p className="text-xs text-slate-400">
                            {rec.actionable}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Target className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">
                      Keep solving problems to get personalized recommendations!
                    </p>
                  </div>
                )}

                {/* General Study Tips */}
                <div className="border-t border-slate-700 pt-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-400" />
                    Study Tips
                  </h4>
                  <div className="space-y-2 text-xs text-slate-400">
                    <p>• Focus on understanding concepts rather than memorizing solutions</p>
                    <p>• Practice regularly in short, focused sessions</p>
                    <p>• Review mistakes to identify knowledge gaps</p>
                    <p>• Challenge yourself with gradually increasing difficulty</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats Summary */}
          {/* <Card className="bg-slate-800/50 border-slate-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-white">
                <Award className="h-5 w-5 text-gold-400" />
                Quick Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">This Week</span>
                  <span className="text-white font-medium">{stats.weekly_problems_solved} problems</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">This Month</span>
                  <span className="text-white font-medium">{stats.monthly_problems_solved} problems</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">All Time</span>
                  <span className="text-white font-medium">{stats.total_problems_solved} problems</span>
                </div>
                <div className="border-t border-slate-700 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-400">Success Rate</span>
                    <span className="text-white font-medium">
                      {((stats.correct_attempts / Math.max(stats.total_attempts, 1)) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card> */}
        </div>
      </div>

      {/* Additional Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Difficulty Distribution */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Target className="h-5 w-5 text-red-400" />
              Difficulty Breakdown
            </CardTitle>
            <CardDescription className="text-slate-400">
              How you perform across different difficulty levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={Object.entries(stats.difficulty_stats).map(([level, data]) => ({
                      name: `Level ${level}`,
                      value: data.solved,
                      accuracy: data.accuracy
                    }))}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {Object.entries(stats.difficulty_stats).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={[
                        '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444'
                      ][index % 5]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value: any, name: string, props: any) => [
                      value,
                      `${name} (${props.payload.accuracy?.toFixed(1)}% accuracy)`
                    ]}
                  />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Heatmap Placeholder */}
        <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Calendar className="h-5 w-5 text-indigo-400" />
              Activity Heatmap
            </CardTitle>
            <CardDescription className="text-slate-400">
              Your problem-solving consistency over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Last 7 days activity */}
              <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 7 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  const dateStr = date.toISOString().split('T')[0];
                  const dayData = past30DaysData.find(d => d.date === dateStr);
                  const intensity = dayData ? Math.min(dayData.solved / 5, 1) : 0;
                  
                  return (
                    <div key={i} className="text-center">
                      <div className="text-xs text-slate-500 mb-1">
                        {date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div 
                        className="w-8 h-8 rounded-md border border-slate-600/50 flex items-center justify-center text-xs font-medium"
                        style={{
                          backgroundColor: intensity > 0 ? 
                            `rgba(59, 130, 246, ${0.3 + intensity * 0.7})` : 
                            'rgba(71, 85, 105, 0.3)',
                          color: intensity > 0.3 ? '#ffffff' : '#cbd5e1'
                        }}
                      >
                        {dayData?.solved || 0}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Monthly summary */}
              <div className="border-t border-slate-700 pt-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-white">{stats.monthly_problems_solved}</div>
                    <div className="text-xs text-slate-500">This Month</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{stats.weekly_problems_solved}</div>
                    <div className="text-xs text-slate-500">This Week</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-white">{Math.round(stats.average_accuracy)}%</div>
                    <div className="text-xs text-slate-500">Avg Accuracy</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Advanced Analytics Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subject Correlation Matrix */}
        {/* <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <Activity className="h-5 w-5 text-pink-400" />
              Subject Difficulty Correlation
            </CardTitle>
            <CardDescription className="text-slate-400">
              How subject performance correlates with difficulty levels
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <Scatter>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    type="number" 
                    dataKey="accuracy" 
                    name="Accuracy" 
                    unit="%" 
                    stroke="#9ca3af" 
                    fontSize={12}
                    domain={[0, 100]}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="solved" 
                    name="Problems Solved" 
                    stroke="#9ca3af" 
                    fontSize={12}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    formatter={(value: any, name: string, props: any) => [
                      name === 'accuracy' ? `${value}%` : value,
                      name === 'accuracy' ? 'Accuracy' : 'Problems Solved'
                    ]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.topic || ''}
                  />
                  <Scatter 
                    name="Subjects" 
                    data={topicData.map(topic => ({
                      ...topic,
                      size: Math.max(topic.attempts / 10, 20)
                    }))} 
                    fill="#8B5CF6"
                  />
                </Scatter>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-xs text-slate-500 text-center">
              Each dot represents a subject. Size indicates total attempts.
            </div>
          </CardContent>
        </Card> */}

        {/* Performance Trends */}
        {/* <Card className="bg-slate-800/50 border-slate-700/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-white">
              <TrendingUp className="h-5 w-5 text-emerald-400" />
              Performance Trends
            </CardTitle>
            <CardDescription className="text-slate-400">
              Track your improvement over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={past30DaysData.slice(-14)}>
                  <defs>
                    <linearGradient id="accuracyTrendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#9ca3af" 
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1e293b', 
                      border: '1px solid #475569',
                      borderRadius: '8px',
                      color: '#f8fafc'
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString('en-US', { 
                      weekday: 'short', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#10B981" 
                    fillOpacity={1} 
                    fill="url(#accuracyTrendGradient)"
                    strokeWidth={2}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="solved" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 flex items-center justify-center gap-6 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-slate-400">Accuracy %</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded"></div>
                <span className="text-slate-400">Daily Solved</span>
              </div>
            </div>
          </CardContent>
        </Card> */}
      </div>

      {/* Detailed Topic Analysis Table */}
      <Card className="bg-slate-800/50 border-slate-700/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-white">
            <BarChart3 className="h-5 w-5 text-blue-400" />
            Detailed Subject Analysis
          </CardTitle>
          <CardDescription className="text-slate-400">
            Comprehensive breakdown of your performance by subject
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-medium text-slate-300">Subject</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-300">Solved</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-300">Attempts</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-300">Accuracy</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-300">Trend</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-slate-300">Mastery</th>
                </tr>
              </thead>
              <tbody>
                {topicData.map((topic, index) => {
                  const masteryLevel = topic.accuracy > 90 ? 'Expert' : 
                                     topic.accuracy > 75 ? 'Proficient' : 
                                     topic.accuracy > 60 ? 'Developing' : 'Beginner';
                  const masteryColor = topic.accuracy > 90 ? 'text-purple-400 bg-purple-500/10' : 
                                     topic.accuracy > 75 ? 'text-green-400 bg-green-500/10' : 
                                     topic.accuracy > 60 ? 'text-yellow-400 bg-yellow-500/10' : 'text-red-400 bg-red-500/10';
                  
                  return (
                    <tr key={topic.topic} className="border-b border-slate-700/50 hover:bg-slate-700/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-medium text-white">{topic.topic}</div>
                      </td>
                      <td className="text-center py-3 px-4 text-slate-300">{topic.solved}</td>
                      <td className="text-center py-3 px-4 text-slate-300">{topic.attempts}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`font-medium ${
                          topic.accuracy > 80 ? 'text-green-400' : 
                          topic.accuracy > 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {topic.accuracy.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {topic.accuracy > 75 ? (
                          <ArrowUp className="h-4 w-4 text-green-400 mx-auto" />
                        ) : topic.accuracy < 60 ? (
                          <ArrowDown className="h-4 w-4 text-red-400 mx-auto" />
                        ) : (
                          <div className="w-4 h-4 bg-slate-600 rounded-full mx-auto"></div>
                        )}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`text-xs px-2 py-1 rounded-full ${masteryColor} border border-current/20`}>
                          {masteryLevel}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}