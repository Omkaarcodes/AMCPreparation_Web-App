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
}