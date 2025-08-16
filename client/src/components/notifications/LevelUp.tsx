import React, { useState, useEffect } from 'react';
import { Trophy, Star, Zap, X } from 'lucide-react';

interface LevelUpNotificationProps {
    isVisible: boolean;
    oldLevel: number;
    newLevel: number;
    onClose: () => void;
}

export const LevelUpNotification: React.FC<LevelUpNotificationProps> = ({
    isVisible,
    oldLevel,
    newLevel,
    onClose
}) => {
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        if (isVisible) {
            setIsAnimating(true);
            // Auto-close after 5 seconds
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        } else {
            setIsAnimating(false);
        }
    }, [isVisible, onClose]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className={`relative bg-gradient-to-br from-yellow-400/20 to-orange-500/20 border-2 border-yellow-400/50 rounded-2xl p-8 max-w-md w-full text-center transform transition-all duration-500 ${
                isAnimating ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
            }`}>
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
                >
                    <X className="h-5 w-5" />
                </button>

                {/* Animated Icons */}
                <div className="flex justify-center mb-6 relative">
                    <div className="relative">
                        <Trophy className="h-16 w-16 text-yellow-400 animate-bounce" />
                        <div className="absolute -top-2 -right-2">
                            <Star className="h-6 w-6 text-yellow-300 animate-pulse" />
                        </div>
                        <div className="absolute -bottom-1 -left-2">
                            <Zap className="h-6 w-6 text-orange-400 animate-pulse delay-150" />
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold text-white">
                        🎉 Level Up! 🎉
                    </h2>
                    
                    <div className="space-y-2">
                        <p className="text-gray-300">
                            Congratulations! You've advanced from
                        </p>
                        <div className="flex items-center justify-center gap-4">
                            <span className="px-3 py-1 bg-gray-700 rounded-full text-gray-300">
                                Level {oldLevel}
                            </span>
                            <span className="text-yellow-400">→</span>
                            <span className="px-3 py-1 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full text-white font-bold">
                                Level {newLevel}
                            </span>
                        </div>
                    </div>

                    <div className="mt-6 p-4 bg-black/20 rounded-lg">
                        <p className="text-sm text-gray-400 mb-2">Level {newLevel} Unlocked!</p>
                        <p className="text-white">
                            Keep practicing to unlock even more challenging problems and earn more XP!
                        </p>
                    </div>
                </div>

                {/* Sparkle Effects */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(8)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-ping"
                            style={{
                                left: `${20 + (i * 10)}%`,
                                top: `${15 + (i * 8)}%`,
                                animationDelay: `${i * 0.2}s`,
                                animationDuration: '2s'
                            }}
                        >
                            ✨
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Hook to manage level up notifications
export const useLevelUpNotification = () => {
    const [notification, setNotification] = useState<{
        isVisible: boolean;
        oldLevel: number;
        newLevel: number;
    }>({
        isVisible: false,
        oldLevel: 1,
        newLevel: 1
    });

    const showLevelUp = (oldLevel: number, newLevel: number) => {
        setNotification({
            isVisible: true,
            oldLevel,
            newLevel
        });
    };

    const hideLevelUp = () => {
        setNotification(prev => ({ ...prev, isVisible: false }));
    };

    return {
        notification,
        showLevelUp,
        hideLevelUp
    };
};

