/**
 * InteractiveDemo is a React component that provides an interactive demo of AMC-style math problems.
 * 
 * Features:
 * - Presents a series of sample AMC problems with multiple-choice answers.
 * - Tracks user progress, score, XP gained, and time remaining for each problem.
 * - Provides instant feedback on answer submission, including correctness, explanations, and XP rewards.
 * - Offers adaptive hints for each problem.
 * - Displays a summary and call-to-action upon demo completion.
 * - Responsive UI with animated transitions and visual feedback.
 * 
 * State Management:
 * - `currentProblem`: Index of the current problem being displayed.
 * - `selectedAnswer`: The user's selected answer index for the current problem.
 * - `showResult`: Whether to display the result and explanation for the current problem.
 * - `showHint`: Whether to display a hint for the current problem.
 * - `score`: The user's current score.
 * - `timeLeft`: Time remaining for the current problem (in seconds).
 * - `isActive`: Whether the demo is currently active.
 * - `xpGained`: XP earned for the current problem.
 * 
 * Usage:
 * - Renders an initial landing card with demo features and a "Start Demo" button.
 * - On starting, presents problems one by one, allowing answer selection, hint viewing, and answer submission.
 * - After each submission, shows feedback and explanation, and allows proceeding to the next problem or restarting.
 * - On completion, displays a summary and a call-to-action.
 * 
 * Dependencies:
 * - Assumes existence of `sampleProblems` data and various UI components (Card, Button, Badge, Progress, etc.).
 * - Uses icons from a compatible icon library.
 */



import {useState, useEffect} from 'react';
import {Button} from './button';
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from './infocard';
import {Badge} from './badge';
import {Progress} from './progress';
import {
  CheckCircle,
  XCircle,
  Lightbulb,
  Clock,
  Target,
  TrendingUp,
  RotateCcw,
  ArrowRight,
  Zap,
  Trophy,
} from "lucide-react";

interface Problem {
  id: number;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  topic: string;
  difficulty: "Easy" | "Medium" | "Hard";
  hint: string;
}

const sampleProblems: Problem[] = [
  {
    id: 1,
    question: "If x + y = 10 and x - y = 4, what is the value of x² - y²?",
    options: ["24", "40", "56", "84", "96"],
    correctAnswer: 1,
    explanation:
      "We can use the identity x² - y² = (x + y)(x - y). Since x + y = 10 and x - y = 4, we have x² - y² = 10 × 4 = 40.",
    topic: "Algebra",
    difficulty: "Easy",
    hint: "Try using the difference of squares formula: x² - y² = (x + y)(x - y)",
  },
  {
    id: 2,
    question: "A circle has center (3, 4) and passes through the point (7, 1). What is the radius of the circle?",
    options: ["3", "4", "5", "6", "7"],
    correctAnswer: 2,
    explanation:
      "The radius is the distance from the center to any point on the circle. Using the distance formula: r = √[(7-3)² + (1-4)²] = √[16 + 9] = √25 = 5.",
    topic: "Geometry",
    difficulty: "Medium",
    hint: "Use the distance formula to find the distance between the center and the given point.",
  },
  {
    id: 3,
    question: "How many positive integers less than 1000 are divisible by both 6 and 8?",
    options: ["41", "42", "83", "125", "166"],
    correctAnswer: 0,
    explanation:
      "Numbers divisible by both 6 and 8 are divisible by LCM(6,8) = 24. We need positive multiples of 24 less than 1000. Since 24 × 41 = 984 < 1000 and 24 × 42 = 1008 > 1000, there are 41 such numbers.",
    topic: "Number Theory",
    difficulty: "Hard",
    hint: "Find the LCM of 6 and 8, then count multiples of that LCM less than 1000.",
  },
]


export default function InteractiveDemo() {
  const [currentProblem, setCurrentProblem] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [showResult, setShowResult] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [score, setScore] = useState(0)
  const [timeLeft, setTimeLeft] = useState(120) // 2 minutes per problem
  const [isActive, setIsActive] = useState(false)
  const [xpGained, setXpGained] = useState(0)

  const problem = sampleProblems[currentProblem]

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (isActive && timeLeft > 0 && !showResult) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1)
      }, 1000)
    } else if (timeLeft === 0) {
      handleSubmit()
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isActive, timeLeft, showResult])

  const startDemo = () => {
    setIsActive(true)
    setTimeLeft(120)
    setCurrentProblem(0)
    setScore(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setShowHint(false)
    setXpGained(0)
  }

  const handleSubmit = () => {
    if (selectedAnswer === null && timeLeft > 0) return

    const isCorrect = selectedAnswer === problem.correctAnswer
    setShowResult(true)
    setIsActive(false)

    if (isCorrect) {
      const baseXP = problem.difficulty === "Easy" ? 10 : problem.difficulty === "Medium" ? 15 : 20
      const timeBonus = Math.floor(timeLeft / 10)
      const totalXP = baseXP + timeBonus
      setXpGained(totalXP)
      setScore(score + 1)
    }
  }

  const nextProblem = () => {
    if (currentProblem < sampleProblems.length - 1) {
      setCurrentProblem(currentProblem + 1)
      setSelectedAnswer(null)
      setShowResult(false)
      setShowHint(false)
      setTimeLeft(120)
      setIsActive(true)
      setXpGained(0)
    }
  }

  const resetDemo = () => {
    setCurrentProblem(0)
    setSelectedAnswer(null)
    setShowResult(false)
    setShowHint(false)
    setScore(0)
    setTimeLeft(120)
    setIsActive(false)
    setXpGained(0)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-600/20 text-green-400 border-green-600/30"
      case "Medium":
        return "bg-yellow-600/20 text-yellow-400 border-yellow-600/30"
      case "Hard":
        return "bg-red-600/20 text-red-400 border-red-600/30"
      default:
        return "bg-gray-600/20 text-gray-400 border-gray-600/30"
    }
  }

if (!isActive && currentProblem === 0 && score === 0) {
    return (
      <Card className="bg-gray-800 border-gray-700 demo-scale-in">
        <CardHeader className="text-center">
          <CardTitle className="text-white text-2xl mb-4">Interactive AMC Demo</CardTitle>
          <CardDescription className="text-gray-400 text-lg">
            Experience our adaptive learning system with real AMC problems. Get instant feedback, hints, and detailed
            explanations.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-gray-700 p-4 rounded-lg">
              <Target className="h-6 w-6 text-blue-400 mx-auto mb-2" />
              <div className="text-white font-semibold">Real AMC Problems</div>
              <div className="text-gray-400 text-sm">Authentic competition questions</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <Lightbulb className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-white font-semibold">Smart Hints</div>
              <div className="text-gray-400 text-sm">Adaptive guidance system</div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
              <div className="text-white font-semibold">Instant Analytics</div>
              <div className="text-gray-400 text-sm">Performance tracking</div>
            </div>
          </div>
          <Button
            onClick={startDemo}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg shadow-lg shadow-blue-600/25 hover:shadow-blue-600/40 transition-all duration-200"
          >
            Start Demo
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Progress and Stats Bar */}
      <Card className="bg-gray-800 border-gray-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center space-x-4">
              <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">
                Problem {currentProblem + 1} of {sampleProblems.length}
              </Badge>
              <Badge className={getDifficultyColor(problem.difficulty)}>{problem.difficulty}</Badge>
              <Badge className="bg-purple-600/20 text-purple-400 border-purple-600/30">{problem.topic}</Badge>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-400" />
                <span className={`font-mono ${timeLeft < 30 ? "text-red-400" : "text-gray-300"}`}>
                  {formatTime(timeLeft)}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Target className="h-4 w-4 text-green-400" />
                <span className="text-green-400 font-semibold">Score: {score}</span>
              </div>
              {xpGained > 0 && (
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-400" />
                  <span className="text-yellow-400 font-semibold">+{xpGained} XP</span>
                </div>
              )}
            </div>
          </div>
          <Progress value={((120 - timeLeft) / 120) * 100} className="mt-3" />
        </CardContent>
      </Card>

      {/* Problem Card */}
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white text-xl">{problem.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {problem.options.map((option, index) => (
              <button
                key={index}
                onClick={() => !showResult && setSelectedAnswer(index)}
                disabled={showResult}
                className={`p-4 text-left rounded-lg border transition-all duration-200 ${
                  showResult
                    ? index === problem.correctAnswer
                      ? "bg-green-600/20 border-green-600 text-green-400"
                      : index === selectedAnswer && index !== problem.correctAnswer
                        ? "bg-red-600/20 border-red-600 text-red-400"
                        : "bg-gray-700 border-gray-600 text-gray-400"
                    : selectedAnswer === index
                      ? "bg-blue-600/20 border-blue-600 text-blue-400"
                      : "bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="font-semibold">({String.fromCharCode(65 + index)})</span>
                  <span>{option}</span>
                  {showResult && index === problem.correctAnswer && (
                    <CheckCircle className="h-5 w-5 text-green-400 ml-auto" />
                  )}
                  {showResult && index === selectedAnswer && index !== problem.correctAnswer && (
                    <XCircle className="h-5 w-5 text-red-400 ml-auto" />
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            {!showResult ? (
              <>
                <Button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                  Submit Answer
                </Button>
                <Button
                  onClick={() => setShowHint(!showHint)}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Lightbulb className="h-4 w-4 mr-2" />
                  {showHint ? "Hide Hint" : "Show Hint"}
                </Button>
              </>
            ) : (
              <div className="flex gap-3">
                {currentProblem < sampleProblems.length - 1 ? (
                  <Button onClick={nextProblem} className="bg-green-600 hover:bg-green-700">
                    Next Problem
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button onClick={resetDemo} className="bg-purple-600 hover:bg-purple-700">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Hint */}
          {showHint && (
            <Card className="bg-yellow-600/10 border-yellow-600/30">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-yellow-400 font-semibold mb-1">Hint:</div>
                    <div className="text-gray-300">{problem.hint}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Explanation */}
          {showResult && (
            <Card className="bg-blue-600/10 border-blue-600/30">
              <CardContent className="p-4">
                <div className="flex items-start space-x-2">
                  <div className="flex-shrink-0">
                    {selectedAnswer === problem.correctAnswer ? (
                      <CheckCircle className="h-5 w-5 text-green-400 mt-0.5" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-400 mt-0.5" />
                    )}
                  </div>
                  <div>
                    <div
                      className={`font-semibold mb-2 ${
                        selectedAnswer === problem.correctAnswer ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      {selectedAnswer === problem.correctAnswer ? "Correct!" : "Incorrect"}
                      {selectedAnswer === problem.correctAnswer && xpGained > 0 && (
                        <span className="text-yellow-400 ml-2">+{xpGained} XP earned!</span>
                      )}
                    </div>
                    <div className="text-gray-300">{problem.explanation}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Demo Complete */}
      {showResult && currentProblem === sampleProblems.length - 1 && (
        <Card className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-blue-600/30">
          <CardContent className="p-6 text-center">
            <Trophy className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-white mb-2">Demo Complete!</h3>
            <p className="text-gray-300 mb-4">
              You scored {score} out of {sampleProblems.length} problems. Ready to unlock your full potential?
            </p>
            
          </CardContent>
        </Card>
      )}
    </div>
  )
}
