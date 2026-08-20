import React, { useState, useCallback, useRef } from 'react';
import { X, Shield, Database, CheckCircle, XCircle, AlertTriangle, Play, Loader2, Eye, RefreshCw, Clock, User, Lock, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';

interface RLSTestCase {
  id: string;
  name: string;
  description: string;
  table: string;
  operation: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  query: string;
  expectedResult: 'ALLOW' | 'DENY' | 'PARTIAL';
  expectedRowCount?: number;
  testUserId?: string;
  category: string;
}

interface TestResult {
  testCaseId: string;
  success: boolean;
  actualResult: 'ALLOW' | 'DENY' | 'PARTIAL' | 'ERROR';
  actualRowCount?: number;
  executionTime: number;
  errorMessage?: string;
  data?: any[];
  timestamp: Date;
}

interface RLSPolicyTesterProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any; // Firebase user object
}

const defaultTestCases: RLSTestCase[] = [
  {
    id: 'problems-select-public',
    name: 'Problems - Public Read Access',
    description: 'Test that authenticated users can read from Problems_DataBank',
    table: 'Problems_DataBank',
    operation: 'SELECT',
    query: 'SELECT COUNT(*) as count FROM Problems_DataBank LIMIT 10',
    expectedResult: 'ALLOW',
    category: 'Problems Access'
  },
  {
    id: 'problems-select-specific',
    name: 'Problems - Specific Problem Access',
    description: 'Test reading a specific problem by ID',
    table: 'Problems_DataBank', 
    operation: 'SELECT',
    query: "SELECT * FROM Problems_DataBank WHERE topic = 'Algebra' LIMIT 5",
    expectedResult: 'ALLOW',
    category: 'Problems Access'
  },
  {
    id: 'user-data-own-access',
    name: 'User Data - Own Records',
    description: 'Test that users can access their own user_problem_data',
    table: 'user_problem_data',
    operation: 'SELECT', 
    query: 'SELECT * FROM user_problem_data WHERE user_id = auth.uid()',
    expectedResult: 'ALLOW',
    category: 'User Data Access'
  },
  {
    id: 'user-data-other-access',
    name: 'User Data - Other Users Records',
    description: 'Test that users cannot access other users data',
    table: 'user_problem_data',
    operation: 'SELECT',
    query: "SELECT * FROM user_problem_data WHERE user_id != auth.uid() LIMIT 1",
    expectedResult: 'DENY',
    category: 'User Data Access'
  },
  {
    id: 'user-analytics-own',
    name: 'User Analytics - Own Records',
    description: 'Test access to own analytics data',
    table: 'user_analytics',
    operation: 'SELECT',
    query: 'SELECT * FROM user_analytics WHERE user_id = auth.uid()',
    expectedResult: 'ALLOW', 
    category: 'Analytics Access'
  },
  {
    id: 'user-analytics-other',
    name: 'User Analytics - Other Users',
    description: 'Test denial of access to other users analytics',
    table: 'user_analytics',
    operation: 'SELECT',
    query: "SELECT * FROM user_analytics WHERE user_id != auth.uid() LIMIT 1",
    expectedResult: 'DENY',
    category: 'Analytics Access'
  }
];

export default function RLSPolicyTester({ isOpen, onClose, user }: RLSPolicyTesterProps) {
  const [testCases, setTestCases] = useState<RLSTestCase[]>(defaultTestCases);
  const [results, setResults] = useState<Record<string, TestResult>>({});
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string>('');

  const testRunsRef = useRef<Record<string, AbortController>>({});

  const categories = ['All', ...Array.from(new Set(testCases.map(tc => tc.category)))];

  const getSupabaseToken = async (): Promise<string> => {
    if (!user) {
      throw new Error('No Firebase user signed in');
    }

    console.log('Getting Firebase ID token for RLS testing...');
    const idToken = await user.getIdToken(true);
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
    
    console.log('Calling edge function for authentication...');
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
    console.log('Got Supabase token for RLS testing');
    
    return data.access_token;
  };

  const authenticateForTesting = async () => {
    setIsAuthenticating(true);
    setAuthError('');
    
    try {
      const token = await getSupabaseToken();
      setAuthToken(token);
      console.log('Successfully authenticated for RLS testing');
    } catch (error) {
      console.error('Authentication failed:', error);
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const executeQuery = async (testCase: RLSTestCase, abortSignal: AbortSignal): Promise<TestResult> => {
    const startTime = Date.now();
    
    try {
      if (!authToken) {
        throw new Error('Not authenticated - please authenticate first');
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      // For SELECT queries, we use the REST API
      if (testCase.operation === 'SELECT') {
        // Convert SQL query to REST API call
        let restUrl = `${supabaseUrl}/rest/v1/`;
        let queryParams = new URLSearchParams();
        
        // Simple query parsing for common patterns
        if (testCase.query.includes('COUNT(*)')) {
          // Count query
          restUrl += testCase.table;
          queryParams.set('select', '*');
          queryParams.set('head', 'true');
        } else if (testCase.query.includes('WHERE')) {
          // Query with conditions
          restUrl += testCase.table;
          
          // Extract SELECT fields
          const selectMatch = testCase.query.match(/SELECT\s+(.*?)\s+FROM/i);
          if (selectMatch) {
            const fields = selectMatch[1].trim();
            if (fields !== '*') {
              queryParams.set('select', fields);
            } else {
              queryParams.set('select', '*');
            }
          }
          
          // Extract WHERE clause
          const whereMatch = testCase.query.match(/WHERE\s+(.+?)(?:\s+LIMIT|\s*$)/i);
          if (whereMatch) {
            let whereClause = whereMatch[1].trim();
            
            // Handle auth.uid() function
            if (whereClause.includes('auth.uid()') && user) {
              whereClause = whereClause.replace(/auth\.uid\(\)/g, user.uid);
            }
            
            // Convert simple WHERE clauses to PostgREST format
            if (whereClause.includes('=')) {
              const [column, value] = whereClause.split('=').map(s => s.trim());
              if (value.startsWith("'") && value.endsWith("'")) {
                queryParams.set(`${column}`, `eq.${value.slice(1, -1)}`);
              } else if (value !== user?.uid) {
                queryParams.set(`${column}`, `eq.${value}`);
              } else {
                queryParams.set(`${column}`, `eq.${user.uid}`);
              }
            } else if (whereClause.includes('!=')) {
              const [column, value] = whereClause.split('!=').map(s => s.trim());
              if (value !== user?.uid) {
                queryParams.set(`${column}`, `neq.${user.uid}`);
              }
            }
          }
          
          // Extract LIMIT
          const limitMatch = testCase.query.match(/LIMIT\s+(\d+)/i);
          if (limitMatch) {
            queryParams.set('limit', limitMatch[1]);
          }
        } else {
          // Simple SELECT *
          restUrl += testCase.table;
          queryParams.set('select', '*');
          queryParams.set('limit', '10');
        }

        const fullUrl = `${restUrl}?${queryParams.toString()}`;
        console.log('Executing REST query:', fullUrl);

        const response = await fetch(fullUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
            'Prefer': 'count=exact'
          },
          signal: abortSignal
        });

        const executionTime = Date.now() - startTime;

        if (abortSignal.aborted) {
          throw new Error('Test was cancelled');
        }

        let actualResult: 'ALLOW' | 'DENY' | 'PARTIAL' | 'ERROR';
        let data: any[] = [];
        let actualRowCount = 0;
        let errorMessage: string | undefined;

        if (response.ok) {
          data = await response.json();
          actualRowCount = Array.isArray(data) ? data.length : 0;
          
          // Check content-range header for total count
          const contentRange = response.headers.get('content-range');
          if (contentRange) {
            const match = contentRange.match(/\/(\d+)$/);
            if (match) {
              actualRowCount = parseInt(match[1]);
            }
          }
          
          if (actualRowCount > 0) {
            actualResult = 'ALLOW';
          } else if (actualRowCount === 0 && testCase.expectedResult === 'DENY') {
            actualResult = 'DENY';
          } else {
            actualResult = 'ALLOW'; // Empty result but query succeeded
          }
        } else {
          const errorData = await response.json().catch(() => ({}));
          errorMessage = errorData.message || `HTTP ${response.status}: ${response.statusText}`;
          
          if (response.status === 401 || response.status === 403) {
            actualResult = 'DENY';
          } else {
            actualResult = 'ERROR';
          }
        }

        const success = actualResult === testCase.expectedResult;

        return {
          testCaseId: testCase.id,
          success,
          actualResult,
          actualRowCount,
          executionTime,
          errorMessage,
          data: data.slice(0, 5), // Limit data for display
          timestamp: new Date()
        };
      } else {
        // For non-SELECT operations, return a placeholder for now
        throw new Error(`${testCase.operation} operations not yet implemented in tester`);
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      if (abortSignal.aborted) {
        throw error; // Re-throw abort errors
      }

      return {
        testCaseId: testCase.id,
        success: false,
        actualResult: 'ERROR',
        executionTime,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date()
      };
    }
  };

  const runSingleTest = async (testCase: RLSTestCase) => {
    const abortController = new AbortController();
    testRunsRef.current[testCase.id] = abortController;
    
    setRunningTests(prev => {
      const newSet = new Set(prev);
      newSet.add(testCase.id);
      return newSet;
    });
    
    try {
      const result = await executeQuery(testCase, abortController.signal);
      setResults(prev => ({
        ...prev,
        [testCase.id]: result
      }));
    } catch (error) {
      if (!abortController.signal.aborted) {
        const result: TestResult = {
          testCaseId: testCase.id,
          success: false,
          actualResult: 'ERROR',
          executionTime: 0,
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date()
        };
        setResults(prev => ({
          ...prev,
          [testCase.id]: result
        }));
      }
    } finally {
      delete testRunsRef.current[testCase.id];
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(testCase.id);
        return newSet;
      });
    }
  };

  const runAllTests = async () => {
    if (!authToken) {
      setAuthError('Please authenticate first before running tests');
      return;
    }

    setIsRunningAll(true);
    const filteredTests = selectedCategory === 'All' 
      ? testCases 
      : testCases.filter(tc => tc.category === selectedCategory);
    
    // Clear previous results for tests we're about to run
    setResults(prev => {
      const newResults = { ...prev };
      filteredTests.forEach(tc => {
        delete newResults[tc.id];
      });
      return newResults;
    });

    // Run tests sequentially to avoid overwhelming the database
    for (const testCase of filteredTests) {
      if (!isRunningAll) break; // Check if user cancelled
      await runSingleTest(testCase);
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    setIsRunningAll(false);
  };

  const cancelAllTests = () => {
    setIsRunningAll(false);
    Object.values(testRunsRef.current).forEach(controller => {
      controller.abort();
    });
    setRunningTests(new Set());
  };

  const getResultIcon = (result?: TestResult) => {
    if (!result) return null;
    
    switch (result.actualResult) {
      case 'ALLOW':
        return result.success 
          ? <CheckCircle className="h-5 w-5 text-green-400" />
          : <XCircle className="h-5 w-5 text-red-400" />;
      case 'DENY': 
        return result.success
          ? <CheckCircle className="h-5 w-5 text-green-400" />
          : <XCircle className="h-5 w-5 text-red-400" />;
      case 'PARTIAL':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'ERROR':
        return <XCircle className="h-5 w-5 text-red-400" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-400" />;
    }
  };

  const getResultColor = (result?: TestResult) => {
    if (!result) return 'text-gray-400';
    
    if (result.success) return 'text-green-400';
    if (result.actualResult === 'ERROR') return 'text-red-400';
    return 'text-yellow-400';
  };

  const filteredTestCases = selectedCategory === 'All' 
    ? testCases 
    : testCases.filter(tc => tc.category === selectedCategory);

  const testStats = {
    total: filteredTestCases.length,
    passed: filteredTestCases.filter(tc => results[tc.id]?.success).length,
    failed: filteredTestCases.filter(tc => results[tc.id] && !results[tc.id].success).length,
    running: runningTests.size
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="bg-gray-800 border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-gray-700">
          <CardTitle className="flex items-center gap-3 text-white">
            <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/20">
              <Shield className="h-5 w-5 text-blue-400" />
            </div>
            RLS Policy Tester
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
          {/* Authentication Section */}
          <Card className="bg-gray-900/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-400" />
                  <span className="font-semibold text-white">Authentication Status</span>
                </div>
                <Badge className={authToken ? "bg-green-600/20 text-green-400 border-green-600/30" : "bg-red-600/20 text-red-400 border-red-600/30"}>
                  {authToken ? "Authenticated" : "Not Authenticated"}
                </Badge>
              </div>
              
              {user && (
                <div className="text-sm text-gray-300 mb-3">
                  <p><span className="text-gray-400">Firebase User:</span> {user.email || user.uid}</p>
                  <p><span className="text-gray-400">User ID:</span> {user.uid}</p>
                </div>
              )}

              {authError && (
                <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3 mb-3">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <XCircle className="h-4 w-4" />
                    {authError}
                  </div>
                </div>
              )}

              <Button
                onClick={authenticateForTesting}
                disabled={isAuthenticating || !user}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
              >
                {isAuthenticating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    {authToken ? 'Re-authenticate' : 'Authenticate for Testing'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Test Controls */}
          <Card className="bg-gray-900/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-purple-400" />
                    <span className="font-semibold text-white">Test Category:</span>
                  </div>
                  
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category} {category !== 'All' ? `(${testCases.filter(tc => tc.category === category).length})` : `(${testCases.length})`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={runAllTests}
                    disabled={!authToken || isRunningAll || runningTests.size > 0}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-gray-600"
                  >
                    {isRunningAll ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Running Tests...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run All Tests
                      </>
                    )}
                  </Button>
                  
                  {(isRunningAll || runningTests.size > 0) && (
                    <Button
                      onClick={cancelAllTests}
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-600/20"
                    >
                      Cancel Tests
                    </Button>
                  )}
                </div>
              </div>

              {/* Test Statistics */}
              <div className="flex gap-6 mt-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                  <span className="text-gray-300">Total: {testStats.total}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-gray-300">Passed: {testStats.passed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                  <span className="text-gray-300">Failed: {testStats.failed}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-gray-300">Running: {testStats.running}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Cases */}
          <div className="space-y-4">
            {filteredTestCases.map((testCase) => {
              const result = results[testCase.id];
              const isRunning = runningTests.has(testCase.id);
              
              return (
                <Card key={testCase.id} className="bg-gray-900/50 border-gray-600">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-white">{testCase.name}</h3>
                          <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30 text-xs">
                            {testCase.operation}
                          </Badge>
                          <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30 text-xs">
                            {testCase.table}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{testCase.description}</p>
                        <div className="text-xs text-gray-500 space-y-1">
                          <p><span className="text-gray-400">Expected:</span> {testCase.expectedResult}</p>
                          {result && (
                            <div className="flex items-center gap-4">
                              <p><span className="text-gray-400">Actual:</span> 
                                <span className={getResultColor(result)}> {result.actualResult}</span>
                              </p>
                              {result.actualRowCount !== undefined && (
                                <p><span className="text-gray-400">Rows:</span> {result.actualRowCount}</p>
                              )}
                              <p><span className="text-gray-400">Time:</span> {result.executionTime}ms</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {result && getResultIcon(result)}
                        
                        <Button
                          onClick={() => runSingleTest(testCase)}
                          disabled={!authToken || isRunning}
                          size="sm"
                          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600"
                        >
                          {isRunning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Query Display */}
                    <details className="group">
                      <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        View Query
                      </summary>
                      <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700">
                        <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono">
                          {testCase.query}
                        </pre>
                      </div>
                    </details>

                    {/* Results Display */}
                    {result && (
                      <div className="mt-3 space-y-2">
                        {result.errorMessage && (
                          <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3">
                            <div className="flex items-center gap-2 text-red-400 text-sm">
                              <XCircle className="h-4 w-4" />
                              {result.errorMessage}
                            </div>
                          </div>
                        )}
                        
                        {result.data && result.data.length > 0 && (
                          <details className="group">
                            <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-300 flex items-center gap-2">
                              <Database className="h-4 w-4" />
                              View Sample Data ({result.data.length} rows)
                            </summary>
                            <div className="mt-2 p-3 bg-gray-800 rounded-lg border border-gray-700 max-h-48 overflow-auto">
                              <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                                {JSON.stringify(result.data, null, 2)}
                              </pre>
                            </div>
                          </details>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Section */}
          <Card className="bg-blue-600/10 border-blue-600/30">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-blue-200">
                  <p className="font-semibold mb-2">RLS Policy Testing Notes:</p>
                  <ul className="space-y-1 text-xs text-blue-100/80">
                    <li>• Tests run against your actual database with real RLS policies</li>
                    <li>• Only SELECT operations are currently supported for safety</li>
                    <li>• Authentication uses the same Firebase → Supabase flow as your app</li>
                    <li>• Tests verify that policies allow/deny access as expected</li>
                    <li>• Failed tests may indicate RLS policy issues or missing permissions</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}