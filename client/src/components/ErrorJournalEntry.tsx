import React, { useState } from 'react';
import { getAuth } from 'firebase/auth';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { 
    BookMarked, 
    Save, 
    X, 
    Loader2, 
    Check,
    AlertCircle,
    ChevronDown
} from 'lucide-react';

interface ErrorJournalEntryProps {
    problemId: string;
    problemContent: string;
    solutionContent?: string;
    userAnswer: string;
    correctAnswer: string;
    onSuccess?: () => void;
    onCancel?: () => void;
}

interface ErrorJournalState {
    isActive: boolean;
    reflection: string;
    category: string;
    customCategory: string;
    isSubmitting: boolean;
    showSuccess: boolean;
    error: string;
    showCategoryDropdown: boolean;
}

const ERROR_CATEGORIES = [
    'Calculation Error',
    'Concept Misunderstanding',
    'Time Management',
    'Problem Interpretation',
    'Need more Practice',
    'Other'
];

export default function ErrorJournalEntry({
    problemId,
    problemContent,
    solutionContent,
    userAnswer,
    correctAnswer,
    onSuccess,
    onCancel
}: ErrorJournalEntryProps) {
    const [state, setState] = useState<ErrorJournalState>({
        isActive: false,
        reflection: '',
        category: '',
        customCategory: '',
        isSubmitting: false,
        showSuccess: false,
        error: '',
        showCategoryDropdown: false
    });

    const auth = getAuth();
    const user = auth.currentUser;

    // Function to get Supabase JWT token using edge function
    const getSupabaseToken = async (): Promise<string> => {
        if (!user) {
            throw new Error('No Firebase user signed in');
        }

        console.log('Getting Firebase ID token for error journal...');
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
        console.log('Got Supabase token for error journal');
        
        return data.access_token;
    };

    const handleStartReflection = () => {
        setState(prev => ({
            ...prev,
            isActive: true,
            reflection: '',
            category: '',
            customCategory: '',
            error: '',
            showSuccess: false
        }));
    };

    const handleCancel = () => {
        setState(prev => ({
            ...prev,
            isActive: false,
            reflection: '',
            category: '',
            customCategory: '',
            error: '',
            showCategoryDropdown: false
        }));
        onCancel?.();
    };

    const handleCategorySelect = (selectedCategory: string) => {
        setState(prev => ({
            ...prev,
            category: selectedCategory,
            customCategory: selectedCategory === 'Other' ? prev.customCategory : '',
            showCategoryDropdown: false
        }));
    };

    const handleSubmitReflection = async () => {
        if (!user) {
            setState(prev => ({ ...prev, error: 'You must be logged in to submit reflections' }));
            return;
        }

        if (!state.reflection.trim()) {
            setState(prev => ({ ...prev, error: 'Please enter a reflection' }));
            return;
        }

        if (!state.category) {
            setState(prev => ({ ...prev, error: 'Please select a category' }));
            return;
        }

        if (state.category === 'Other' && !state.customCategory.trim()) {
            setState(prev => ({ ...prev, error: 'Please enter a custom category' }));
            return;
        }

        setState(prev => ({ ...prev, isSubmitting: true, error: '' }));

        try {
            const token = await getSupabaseToken();
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
            const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

            const journalData = {
                user_id_for_journal: user.uid,
                problem_id: problemId,
                mistake_note: state.reflection.trim(),
                category: state.category === 'Other' ? state.customCategory.trim() : state.category,
                logged_at: new Date().toISOString()
            };

            console.log('Submitting error journal entry:', journalData);

            const response = await fetch(`${supabaseUrl}/rest/v1/error_journal`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': anonKey,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation'
                },
                body: JSON.stringify(journalData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error journal submission failed:', errorText);
                throw new Error(`Submission failed: HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            console.log('Error journal entry created:', result);

            // Show success state
            setState(prev => ({ 
                ...prev, 
                isSubmitting: false, 
                showSuccess: true, 
                error: '' 
            }));

            // Reset after a delay
            setTimeout(() => {
                setState(prev => ({
                    ...prev,
                    isActive: false,
                    reflection: '',
                    category: '',
                    customCategory: '',
                    showSuccess: false,
                    showCategoryDropdown: false
                }));
                onSuccess?.();
            }, 2000);

        } catch (error) {
            console.error('Error submitting reflection:', error);
            setState(prev => ({ 
                ...prev, 
                isSubmitting: false,
                error: error instanceof Error ? error.message : 'Failed to submit reflection'
            }));
        }
    };

    if (!state.isActive) {
        return (
            <div className="mt-4">
                <Button
                    onClick={handleStartReflection}
                    variant="outline"
                    className="border-orange-600/50 text-orange-400 hover:bg-orange-600/10 hover:border-orange-600"
                >
                    <BookMarked className="h-4 w-4 mr-2" />
                    Submit Reflection
                </Button>
            </div>
        );
    }

    if (state.showSuccess) {
        return (
            <Card className="mt-4 bg-green-600/10 border-green-600/30">
                <CardContent className="p-4">
                    <div className="flex items-center gap-2 text-green-400">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">Reflection submitted successfully!</span>
                    </div>
                </CardContent>
            </Card>
        );
    }

    // Active reflection form
    return (
        <Card className="mt-4 bg-orange-600/10 border-orange-600/30">
            <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <BookMarked className="h-5 w-5 text-orange-400" />
                        <span className="font-medium text-orange-400">Error Journal Entry</span>
                    </div>
                    <Button
                        onClick={handleCancel}
                        variant="ghost"
                        size="sm"
                        className="text-gray-400 hover:text-white hover:bg-gray-700"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>

                {/* Category Selection */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Category</label>
                    <div className="relative">
                        <button
                            onClick={() => setState(prev => ({ 
                                ...prev, 
                                showCategoryDropdown: !prev.showCategoryDropdown 
                            }))}
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white text-left hover:bg-gray-900/70 transition-colors flex items-center justify-between"
                        >
                            <span>{state.category || 'Select a category...'}</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${
                                state.showCategoryDropdown ? 'rotate-180' : ''
                            }`} />
                        </button>

                        {state.showCategoryDropdown && (
                            <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                                {ERROR_CATEGORIES.map((category) => (
                                    <button
                                        key={category}
                                        onClick={() => handleCategorySelect(category)}
                                        className={`w-full px-3 py-2 text-left hover:bg-gray-700 transition-colors ${
                                            state.category === category ? 'bg-orange-500/20 text-orange-400' : 'text-gray-300'
                                        }`}
                                    >
                                        {category}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Custom category input */}
                    {state.category === 'Other' && (
                        <input
                            type="text"
                            value={state.customCategory}
                            onChange={(e) => setState(prev => ({ 
                                ...prev, 
                                customCategory: e.target.value 
                            }))}
                            placeholder="Enter custom category..."
                            className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                    )}
                </div>

                {/* Reflection Text Area */}
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-300">Reflection</label>
                    <textarea
                        value={state.reflection}
                        onChange={(e) => setState(prev => ({ ...prev, reflection: e.target.value }))}
                        placeholder="Think about this problem: what was tricky about it, what did you discover, and what would you do differently? Check out the solution if you need ideas!"
                        rows={4}
                        className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-vertical min-h-[100px]"
                    />
                    <div className="text-xs text-gray-500">
                        Be specific about your mistake and what you learned from it.
                    </div>
                </div>

                {/* Error Message */}
                {state.error && (
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                        <AlertCircle className="h-4 w-4" />
                        <span>{state.error}</span>
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                    <Button
                        onClick={handleSubmitReflection}
                        disabled={state.isSubmitting}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {state.isSubmitting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-2" />
                                Submit Reflection
                            </>
                        )}
                    </Button>
                    <Button
                        onClick={handleCancel}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-700"
                        disabled={state.isSubmitting}
                    >
                        Cancel
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
