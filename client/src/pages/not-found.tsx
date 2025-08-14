import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { User, Plus, RefreshCw, Eye, CheckCircle, XCircle, LogOut, Play, Trash2 } from 'lucide-react';

interface UserProfile {
  id: string;
  created_at: string;
  email?: string;
  display_name?: string;
  last_seen?: string;
}

interface TestResult {
  test: string;
  success: boolean;
  message: string;
  data?: any;
  timestamp: string;
}

export default function ProfileTestPage() {
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [results, setResults] = useState<TestResult[]>([]);
  const [supabaseToken, setSupabaseToken] = useState<string>('');

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      if (user) {
        console.log('Firebase user signed in:', user.email);
      } else {
        // Clear data when user signs out
        setResults([]);
        setSupabaseToken('');
      }
    });

    return () => unsubscribe();
  }, []);

  const setTestLoading = (testName: string, isLoading: boolean) => {
    setLoading(prev => ({ ...prev, [testName]: isLoading }));
  };

  const addResult = (result: TestResult) => {
    setResults(prev => [result, ...prev]); // Add new results to the top
  };

  const clearResults = () => {
    setResults([]);
  };

  // Sign out function
  const handleSignOut = async () => {
    try {
      const auth = getAuth();
      await signOut(auth);
      console.log('User signed out');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Call your edge function to get Supabase JWT
  const getSupabaseToken = async (): Promise<string> => {
    if (!firebaseUser) {
      throw new Error('No Firebase user signed in');
    }

    console.log('Getting Firebase ID token...');
    const idToken = await firebaseUser.getIdToken(true);
    
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

  // Test 1: Call edge function
  const testEdgeFunction = async () => {
    if (!firebaseUser) {
      alert('Please sign in first!');
      return;
    }

    setTestLoading('edge-function', true);
    
    try {
      const token = await getSupabaseToken();
      setSupabaseToken(token.substring(0, 50) + '...');
      
      addResult({
        test: 'Edge Function Call',
        success: true,
        message: 'Edge function called successfully - got Supabase JWT token',
        data: { tokenLength: token.length },
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addResult({
        test: 'Edge Function Call',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    setTestLoading('edge-function', false);
  };

  // Test 2: Check if profile exists
  const checkProfileExists = async () => {
    if (!firebaseUser) {
      alert('Please sign in first!');
      return;
    }

    setTestLoading('check-profile', true);
    
    try {
      const token = await getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const profiles: UserProfile[] = await response.json();
      
      addResult({
        test: 'Check Profile Exists',
        success: profiles.length > 0,
        message: profiles.length > 0 
          ? `Found profile! Email: ${profiles[0].email}, Name: ${profiles[0].display_name || 'None'}`
          : 'No profile found - need to create one',
        data: profiles,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addResult({
        test: 'Check Profile Exists',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    setTestLoading('check-profile', false);
  };

  // Test 3: Create profile
  const createProfile = async () => {
    if (!firebaseUser) {
      alert('Please sign in first!');
      return;
    }

    setTestLoading('create-profile', true);
    
    try {
      const token = await getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const profileData = {
        id: firebaseUser.uid,
        email: firebaseUser.email,
        display_name: firebaseUser.displayName || null,
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
        
        // Check if it's a duplicate key error (profile already exists)
        if (response.status === 409 || errorText.includes('duplicate key')) {
          addResult({
            test: 'Create Profile',
            success: true,
            message: 'Profile already exists - skipping creation',
            data: null,
            timestamp: new Date().toLocaleTimeString()
          });
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const createdProfile = await response.json();

      addResult({
        test: 'Create Profile',
        success: true,
        message: `Profile created successfully for ${profileData.email} (ID: ${firebaseUser.uid})`,
        data: createdProfile,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addResult({
        test: 'Create Profile',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    setTestLoading('create-profile', false);
  };

  // Test 4: Update profile display name
  const updateDisplayName = async () => {
    if (!firebaseUser) {
      alert('Please sign in first!');
      return;
    }

    setTestLoading('update-profile', true);
    
    try {
      const token = await getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

      const newName = `Test User ${Date.now()}`;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${firebaseUser.uid}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          display_name: newName,
          last_seen: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const updatedProfile = await response.json();

      addResult({
        test: 'Update Display Name',
        success: true,
        message: `Display name updated to: ${newName}`,
        data: updatedProfile,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addResult({
        test: 'Update Display Name',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    setTestLoading('update-profile', false);
  };

  // Test 5: Delete profile
  const deleteProfile = async () => {
    if (!firebaseUser) {
      alert('Please sign in first!');
      return;
    }

    if (!confirm('Are you sure you want to delete your profile? This action cannot be undone.')) {
      return;
    }

    setTestLoading('delete-profile', true);
    
    try {
      const token = await getSupabaseToken();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/user_profiles?id=eq.${firebaseUser.uid}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': anonKey,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      addResult({
        test: 'Delete Profile',
        success: true,
        message: 'Profile deleted successfully',
        data: null,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (error) {
      addResult({
        test: 'Delete Profile',
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toLocaleTimeString()
      });
    }
    
    setTestLoading('delete-profile', false);
  };

  // Run all tests
  const runAllTests = async () => {
    if (!firebaseUser) {
      alert('Please sign in first!');
      return;
    }

    clearResults();
    
    // Run tests sequentially with small delays
    await testEdgeFunction();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await checkProfileExists();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await createProfile();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    await updateDisplayName();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await checkProfileExists(); // Final verification
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-5xl mx-auto">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-6 h-6" />
              Profile & RLS Individual Test Page
            </CardTitle>
          </CardHeader>
          <CardContent>
            {firebaseUser ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-800 mb-2">Firebase User Signed In ✅</h3>
                  <p className="text-green-700">Email: {firebaseUser.email}</p>
                  <p className="text-green-700">UID: {firebaseUser.uid}</p>
                  {firebaseUser.displayName && (
                    <p className="text-green-700">Display Name: {firebaseUser.displayName}</p>
                  )}
                </div>

                {/* Control Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Button 
                    onClick={runAllTests}
                    disabled={Object.values(loading).some(Boolean)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Run All Tests
                  </Button>

                  <Button 
                    onClick={testEdgeFunction}
                    disabled={loading['edge-function']}
                    variant="outline"
                  >
                    {loading['edge-function'] ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4 mr-2" />
                    )}
                    Test JWT Token
                  </Button>

                  <Button 
                    onClick={checkProfileExists}
                    disabled={loading['check-profile']}
                    variant="outline"
                  >
                    {loading['check-profile'] ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="w-4 h-4 mr-2" />
                    )}
                    Check Profile
                  </Button>

                  <Button 
                    onClick={createProfile}
                    disabled={loading['create-profile']}
                    variant="outline"
                  >
                    {loading['create-profile'] ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <User className="w-4 h-4 mr-2" />
                    )}
                    Create Profile
                  </Button>

                  <Button 
                    onClick={updateDisplayName}
                    disabled={loading['update-profile']}
                    variant="outline"
                  >
                    {loading['update-profile'] ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Update Profile
                  </Button>

                  <Button 
                    onClick={deleteProfile}
                    disabled={loading['delete-profile']}
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {loading['delete-profile'] ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-2" />
                    )}
                    Delete Profile
                  </Button>
                </div>

                {/* Utility Buttons */}
                <div className="flex gap-4 pt-4 border-t">
                  <Button 
                    onClick={clearResults}
                    variant="outline"
                    size="sm"
                  >
                    Clear Results
                  </Button>
                  
                  <Button 
                    onClick={handleSignOut}
                    variant="outline"
                    size="sm"
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </Button>
                </div>

                {supabaseToken && (
                  <div className="bg-gray-50 border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Current Supabase JWT Token:</h3>
                    <code className="text-sm text-gray-700 break-all">{supabaseToken}</code>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Not Signed In</h3>
                <p className="text-yellow-700">Please sign in with Firebase first to test profile creation and RLS.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Test Results */}
        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Test Results ({results.length})
                </div>
                <Button 
                  onClick={clearResults}
                  variant="outline"
                  size="sm"
                >
                  Clear All
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-96 overflow-y-auto">
              <div className="space-y-4">
                {results.map((result, index) => (
                  <div 
                    key={index}
                    className={`border rounded-lg p-4 ${
                      result.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                        <h3 className={`font-semibold ${
                          result.success ? 'text-green-800' : 'text-red-800'
                        }`}>
                          {result.test}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          result.success 
                            ? 'bg-green-200 text-green-800' 
                            : 'bg-red-200 text-red-800'
                        }`}>
                          {result.success ? 'PASS' : 'FAIL'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {result.timestamp}
                      </span>
                    </div>
                    
                    <p className={`text-sm mb-2 ${
                      result.success ? 'text-green-700' : 'text-red-700'
                    }`}>
                      {result.message}
                    </p>

                    {result.data && (
                      <details className="text-xs">
                        <summary className="cursor-pointer font-medium text-gray-600 hover:text-gray-800">
                          Show Data
                        </summary>
                        <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto text-gray-800">
                          {JSON.stringify(result.data, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">Individual Test Operations:</h3>
          <ul className="text-blue-700 text-sm space-y-1 list-disc list-inside">
            <li><strong>Test JWT Token:</strong> Gets Supabase JWT from your edge function</li>
            <li><strong>Check Profile:</strong> Tests RLS read permissions (SELECT)</li>
            <li><strong>Create Profile:</strong> Tests RLS insert permissions (INSERT)</li>
            <li><strong>Update Profile:</strong> Tests RLS update permissions (UPDATE)</li>
            <li><strong>Delete Profile:</strong> Tests RLS delete permissions (DELETE)</li>
            <li><strong>Sign Out:</strong> Clears session and tests with different users</li>
          </ul>
          <p className="text-blue-600 text-sm mt-3">
            <strong>Multi-User Testing:</strong> Sign out, sign in with a different Firebase account, and verify each user can only access their own data!
          </p>
        </div>
      </div>
    </div>
  );
}