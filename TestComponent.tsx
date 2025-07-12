import { useState, useEffect } from 'react';

export default function AnimationTest() {
  const [isVisible, setIsVisible] = useState(false);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    setIsVisible(true);
    const interval = setInterval(() => {
      setCounter(c => c + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-white text-center mb-8 animate-pulse">
          Animation Test Suite
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Basic CSS Animations */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">CSS Animations</h2>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-red-500 rounded-full animate-spin mx-auto"></div>
              <div className="w-16 h-16 bg-green-500 rounded-full animate-ping mx-auto"></div>
              <div className="w-16 h-16 bg-blue-500 rounded-full animate-bounce mx-auto"></div>
            </div>
          </div>

          {/* Hover Animations */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Hover Effects</h2>
            <div className="space-y-4">
              
              <div className="w-full h-16 bg-gradient-to-r from-pink-500 to-yellow-500 rounded transform hover:scale-105 transition-transform duration-300 cursor-pointer"></div>
              <div className="w-full h-16 bg-cyan-500 rounded hover:rotate-6 transition-transform duration-300 cursor-pointer"></div>
            </div>
          </div>

          {/* State-based Animations */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">State Animations</h2>
            <div className="space-y-4">
              <div className={`w-16 h-16 bg-orange-500 rounded-full mx-auto transition-all duration-500 ${
                isVisible ? 'scale-100 opacity-100' : 'scale-0 opacity-0'
              }`}></div>
              <button 
                onClick={() => setIsVisible(!isVisible)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded transition-colors duration-300"
              >
                Toggle Circle
              </button>
            </div>
          </div>

          {/* Loading Animations */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Loading States</h2>
            <div className="space-y-4">
              <div className="flex space-x-2 justify-center">
                <div className="w-3 h-3 bg-white rounded-full animate-bounce"></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Transform Animations */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Transforms</h2>
            <div className="space-y-4">
              <div className="w-16 h-16 bg-teal-500 mx-auto transform hover:rotate-180 transition-transform duration-500"></div>
              <div className="w-16 h-16 bg-rose-500 mx-auto transform hover:skew-x-12 transition-transform duration-300"></div>
              <div className="w-16 h-16 bg-amber-500 mx-auto transform hover:-translate-y-4 transition-transform duration-300"></div>
            </div>
          </div>

          {/* Counter with Animation */}
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4">Dynamic Counter</h2>
            <div className="text-center">
              <div className="text-6xl font-bold text-white mb-2 transition-all duration-300 hover:scale-110">
                {counter}
              </div>
              <p className="text-white/70">Updating every second</p>
            </div>
          </div>

        </div>

        {/* Floating Animation */}
        <div className="mt-8 flex justify-center">
          <div className="w-32 h-32 bg-gradient-to-br from-pink-400 via-purple-400 to-indigo-400 rounded-full animate-pulse shadow-lg shadow-purple-500/50"></div>
        </div>

        {/* Status Indicator */}
        <div className="mt-8 text-center">
          <div className="inline-flex items-center space-x-2 bg-green-500/20 text-green-300 px-4 py-2 rounded-full">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-ping"></div>
            <span>Animations Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}