import React, { useEffect, useState } from "react";
import { 
    getAuth, 
    onAuthStateChanged,
    signOut,
    User
} from 'firebase/auth';

import { useNavigate } from "react-router-dom";

export default function VerificationSuccess() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const auth = getAuth();
    const navigate = useNavigate();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setLoading(false);
            
            if (!currentUser) {
                navigate('/login');
            }
        });

        return () => unsubscribe();
    }, [auth, navigate]);

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
            await signOut(auth);
            navigate('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-green-50">
                <div className="bg-white p-8 rounded-2xl shadow-lg text-center border border-green-300">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                    <p className="text-gray-600 mt-4">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center justify-center min-h-screen bg-green-50">
            <div className="bg-white p-8 rounded-2xl shadow-lg text-center border border-green-300 max-w-md">
                <h1 className="text-2xl font-bold text-green-600 mb-4">
                    ✅ Welcome, {getDisplayName()}!
                </h1>
                <p className="text-gray-600 mb-4">
                    You have successfully logged in! 🎉
                </p>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 mb-6">
                    <p className="text-sm text-green-800">
                        Email: {user?.email || 'N/A'}
                    </p>
                    <p className="text-sm text-green-800">
                        Verified: {user?.emailVerified ? 'Yes' : 'No'}
                    </p>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-full bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                >
                    Logout
                </button>
            </div>
        </div>
    );
}