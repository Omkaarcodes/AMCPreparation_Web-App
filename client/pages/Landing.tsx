"use client"

import { Button } from "../components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/infocard"
import { Badge } from "../components/ui/badge"
import {
  Brain,
  Target,
  TrendingUp,
  Trophy,
  Users,
  Zap,
  BookOpen,
  Timer,
  Award,
  BarChart3,
  Gamepad2,
  Repeat,
  Star,
  GraduationCap,
  Lightbulb,
  Play,
} from "lucide-react"
import { useEffect, useRef } from "react"
import InteractiveDemo from "../components/ui/InteractiveDemo"

export default function LandingPage() {
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove("animate-on-scroll")
            entry.target.classList.add(entry.target.getAttribute("data-animation") || "animate-fade-in-up")
          }
        })
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" },
    )

    const elements = document.querySelectorAll(".animate-on-scroll")
    elements.forEach((el) => observerRef.current?.observe(el))

    return () => observerRef.current?.disconnect()
  }, [])

  const features = [
    {
      icon: Brain,
      title: "Adaptive Quizzes",
      description: "AI-powered difficulty adjustment based on your performance and learning patterns.",
      color: "text-blue-400",
      hoverColor: "hover:border-blue-600/50",
    },
    {
      icon: Repeat,
      title: "Spaced Repetition",
      description: "Scientifically-backed review system for long-term retention of concepts and techniques.",
      color: "text-green-400",
      hoverColor: "hover:border-green-600/50",
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Visualize accuracy, speed, and progress by topic with comprehensive performance insights.",
      color: "text-purple-400",
      hoverColor: "hover:border-purple-600/50",
    },
    {
      icon: BookOpen,
      title: "Error Journal",
      description: "Track and review mistakes with personalized explanations and similar problem recommendations.",
      color: "text-red-400",
      hoverColor: "hover:border-red-600/50",
    },
    {
      icon: Timer,
      title: "Mock Exams",
      description: "Full-length timed practice tests that simulate real AMC conditions and timing.",
      color: "text-yellow-400",
      hoverColor: "hover:border-yellow-600/50",
    },
    {
      icon: Target,
      title: "Mastery Heatmaps",
      description: "Visual representation of your strengths and weaknesses across all AMC topics.",
      color: "text-cyan-400",
      hoverColor: "hover:border-cyan-600/50",
    },
  ]

  const gamificationFeatures = [
    {
      icon: Zap,
      title: "XP & Leveling System",
      description: "Earn experience points for every problem solved and level up your mathematical prowess.",
      bgColor: "bg-blue-600",
      shadowColor: "shadow-blue-600/25",
    },
    {
      icon: Award,
      title: "Badges & Achievements",
      description: "Unlock special badges for mastering topics, maintaining streaks, and reaching milestones.",
      bgColor: "bg-green-600",
      shadowColor: "shadow-green-600/25",
    },
    {
      icon: Users,
      title: "Leaderboards & Duels",
      description: "Compete with peers in weekly challenges and head-to-head problem-solving duels.",
      bgColor: "bg-purple-600",
      shadowColor: "shadow-purple-600/25",
    },
    {
      icon: Gamepad2,
      title: "Custom Playlists",
      description: "Create personalized problem sets and share them with study groups or friends.",
      bgColor: "bg-orange-600",
      shadowColor: "shadow-orange-600/25",
    },
  ]

  const stats = [
    { value: "10,000+", label: "Practice Problems", color: "text-blue-400" },
    { value: "95%", label: "Score Improvement", color: "text-green-400" },
    { value: "50,000+", label: "Students Helped", color: "text-purple-400" },
  ]

  const footerLinks = {
    Product: ["Features", "Demo", "API", "Integrations"],
    Resources: ["Documentation", "Blog", "Help Center", "Community"],
    Company: ["About", "Careers", "Privacy", "Terms"],
  }

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id)
    if (section) {
      section.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center space-x-2">
              <Brain className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold">AMCraft</span>
            </div>
            <nav className="hidden md:flex items-center space-x-8">
              <a
                href="#features"
                onClick={() => scrollToSection("features")}
                className="text-gray-300 hover:text-white transition-colors"
              >
                Features
              </a>
              <button
                onClick={() => scrollToSection("demo")}
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <Play className="h-4 w-4" />
                <span>Demo</span>
              </button>
              <a
                href="#about"
                onClick={() => scrollToSection("about")}
                className="text-gray-300 hover:text-white transition-colors"
              >
                About
              </a>
              <a
                href="#suggest"
                onClick={() => scrollToSection("suggest")}
                className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1"
              >
                <Lightbulb className="h-4 w-4" />
                <span>Suggest Ideas</span>
              </a>
            </nav>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800">
                Sign In
              </Button>
              <Button>
                {" "}
                {/* Uses default shadow */}
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            <div className="space-y-4">
              <Badge
                className="bg-blue-600/20 text-blue-400 border-blue-600/30 px-4 py-1 animate-on-scroll animate-delay-100"
                data-animation="animate-fade-in-up"
              >
                AMC 10/12 Preparation Platform
              </Badge>
              <h1
                className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight animate-on-scroll animate-delay-200"
                data-animation="animate-fade-in-up"
              >
                Master Math Competitions
                <br />
                <span className="text-blue-400">Through Intelligent Practice</span>
              </h1>
              <p
                className="text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed animate-on-scroll animate-delay-300"
                data-animation="animate-fade-in-up"
              >
                Transform your AMC prep with adaptive quizzes, spaced repetition, detailed analytics, and gamified
                learning. Built for serious competitors who want to maximize their potential.
              </p>
            </div>

            <div
              className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-on-scroll animate-delay-400"
              data-animation="animate-fade-in-up"
            >
              <Button size="lg">
                {" "}
                {/* Uses default shadow */}
                Start Practicing Free
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection("demo")}
                className="bg-transparent" // Remove explicit bg-transparent as it's handled by variant
              >
                {" "}
                {/* Uses outline shadow */}
                <Play className="mr-2 h-5 w-5" />
                Try Demo
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
              {stats.map((stat, index) => (
                <div
                  key={index}
                  className="text-center animate-on-scroll"
                  data-animation="animate-scale-in"
                  style={{ animationDelay: `${0.5 + index * 0.1}s` }}
                >
                  <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-gray-400">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold animate-on-scroll" data-animation="animate-fade-in-up">
              Comprehensive Learning Platform
            </h2>
            <p
              className="text-xl text-gray-400 max-w-2xl mx-auto animate-on-scroll animate-delay-100"
              data-animation="animate-fade-in-up"
            >
              Every feature designed to accelerate your AMC performance through data-driven insights and engaging
              practice.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <Card
                  key={index}
                  className={`bg-gray-800 border-gray-700 ${feature.hoverColor} transition-colors animate-on-scroll`}
                  data-animation="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <IconComponent className={`h-8 w-8 ${feature.color} mb-2`} />
                    <CardTitle className="text-white">{feature.title}</CardTitle>
                    <CardDescription className="text-gray-400">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Gamification Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold animate-on-scroll" data-animation="animate-fade-in-up">
              Gamified Learning Experience
            </h2>
            <p
              className="text-xl text-gray-400 max-w-2xl mx-auto animate-on-scroll animate-delay-100"
              data-animation="animate-fade-in-up"
            >
              Stay motivated with XP points, badges, streaks, and competitive features that make learning addictive.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {gamificationFeatures.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <div
                    key={index}
                    className="flex items-start space-x-4 animate-on-scroll"
                    data-animation="animate-fade-in-left"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className={`${feature.bgColor} p-3 rounded-lg shadow-lg ${feature.shadowColor}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                      <p className="text-gray-400">{feature.description}</p>
                    </div>
                  </div>
                )
              })}
            </div>

            <div
              className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700 shadow-2xl animate-on-scroll"
              data-animation="animate-fade-in-right"
            >
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-blue-400 mb-2">Level 12</div>
                  <div className="text-gray-400">Mathematical Warrior</div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mt-4">
                    <div className="bg-blue-600 h-3 rounded-full w-3/4"></div>
                  </div>
                  <div className="text-sm text-gray-400 mt-2">2,340 / 3,000 XP</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <Trophy className="h-6 w-6 text-yellow-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-white">15</div>
                    <div className="text-sm text-gray-400">Badges Earned</div>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg text-center">
                    <TrendingUp className="h-6 w-6 text-green-400 mx-auto mb-2" />
                    <div className="text-lg font-bold text-white">47</div>
                    <div className="text-sm text-gray-400">Day Streak</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold animate-on-scroll" data-animation="animate-fade-in-up">
              Try Our Platform Live
            </h2>
            <p
              className="text-xl text-gray-400 max-w-2xl mx-auto animate-on-scroll animate-delay-100"
              data-animation="animate-fade-in-up"
            >
              Experience our adaptive problem-solving system with this interactive demo. Solve real AMC problems and see
              how our platform provides instant feedback and explanations.
            </p>
          </div>

          <div className="max-w-4xl mx-auto">
            <InteractiveDemo />
          </div>
        </div>
      </section>

      {/* About the Creator Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold animate-on-scroll" data-animation="animate-fade-in-up">
              About the Creator
            </h2>
            <p
              className="text-xl text-gray-400 max-w-3xl mx-auto animate-on-scroll animate-delay-100"
              data-animation="animate-fade-in-up"
            >
              Built by a passionate mathematician and educator dedicated to making competition math accessible to
              everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="animate-on-scroll" data-animation="animate-fade-in-left">
              <div className="bg-gray-800 p-8 rounded-2xl border border-gray-700">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                    <Brain className="h-10 w-10 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Alex Chen</h3>
                    <p className="text-blue-400 font-medium">Founder & Lead Developer</p>
                  </div>
                </div>
                <div className="space-y-4 text-gray-300">
                  <p>
                    As a former AMC competitor who qualified for AIME multiple times, I understand the challenges
                    students face when preparing for math competitions. The lack of personalized, adaptive practice
                    tools motivated me to create AMCraft.
                  </p>
                  <p>
                    With a background in computer science and mathematics education, I've combined my passion for both
                    fields to build a platform that truly adapts to each student's learning journey.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 animate-on-scroll" data-animation="animate-fade-in-right">
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <GraduationCap className="h-8 w-8 text-blue-400 mx-auto mb-3" />
                <div className="text-2xl font-bold text-white">MS</div>
                <div className="text-gray-400">Computer Science</div>
                <div className="text-sm text-gray-500 mt-1">Stanford University</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-3" />
                <div className="text-2xl font-bold text-white">AIME</div>
                <div className="text-gray-400">Qualifier</div>
                <div className="text-sm text-gray-500 mt-1">3 consecutive years</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <Users className="h-8 w-8 text-green-400 mx-auto mb-3" />
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-gray-400">Students Tutored</div>
                <div className="text-sm text-gray-500 mt-1">Over 5 years</div>
              </div>
              <div className="bg-gray-800 p-6 rounded-lg text-center">
                <Star className="h-8 w-8 text-purple-400 mx-auto mb-3" />
                <div className="text-2xl font-bold text-white">2019</div>
                <div className="text-gray-400">Teaching Since</div>
                <div className="text-sm text-gray-500 mt-1">Competition Math</div>
              </div>
            </div>
          </div>

          <div className="text-center animate-on-scroll" data-animation="animate-fade-in-up">
            <Card className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-600/30 max-w-3xl mx-auto">
              <CardHeader>
                <CardTitle className="text-white text-xl">My Mission</CardTitle>
                <CardDescription className="text-gray-300 text-lg leading-relaxed">
                  "I believe every student with mathematical curiosity deserves access to high-quality competition
                  preparation. AMCraft represents my commitment to democratizing math competition education through
                  technology, making it possible for students worldwide to reach their full potential regardless of
                  their geographic location or economic background."
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Suggest Ideas Section */}
      <section id="suggest" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center space-y-4 mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold animate-on-scroll" data-animation="animate-fade-in-up">
              Help Shape AMCraft
            </h2>
            <p
              className="text-xl text-gray-400 max-w-2xl mx-auto animate-on-scroll animate-delay-100"
              data-animation="animate-fade-in-up"
            >
              Your ideas and feedback are invaluable in making AMCraft the best possible platform for math competition
              preparation.
            </p>
          </div>

          <Card className="bg-gray-800 border-gray-700 animate-on-scroll" data-animation="animate-scale-in">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-white text-2xl">Share Your Ideas</CardTitle>
              <CardDescription className="text-gray-400 text-lg">
                Whether it's a new feature, improvement suggestion, or feedback on your experience, we'd love to hear
                from you.
              </CardDescription>
            </CardHeader>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">Feature Requests</h4>
                  <p className="text-gray-400 text-sm">
                    Suggest new features that would enhance your learning experience
                  </p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">Problem Suggestions</h4>
                  <p className="text-gray-400 text-sm">Recommend specific topics or problem types you'd like to see</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">UI/UX Feedback</h4>
                  <p className="text-gray-400 text-sm">Help us improve the user interface and experience</p>
                </div>
                <div className="bg-gray-700 p-4 rounded-lg">
                  <h4 className="text-white font-semibold mb-2">General Feedback</h4>
                  <p className="text-gray-400 text-sm">Share your overall thoughts and suggestions</p>
                </div>
              </div>

              <div className="text-center space-y-4">
                <Button
                  size="lg"
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 text-lg" // Removed shadow classes as they are now default
                >
                  <Lightbulb className="mr-2 h-5 w-5" />
                  Submit Your Ideas
                </Button>
                <p className="text-sm text-gray-400">
                  Join our community of contributors helping to build the future of math competition preparation
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/50 to-purple-900/50">
        <div className="container mx-auto max-w-4xl text-center">
          <div className="space-y-8">
            <h2 className="text-3xl sm:text-4xl font-bold animate-on-scroll" data-animation="animate-fade-in-up">
              Ready to Dominate the AMC?
            </h2>
            <p
              className="text-xl text-gray-300 max-w-2xl mx-auto animate-on-scroll animate-delay-100"
              data-animation="animate-fade-in-up"
            >
              Join thousands of students who have transformed their math competition performance with our intelligent
              practice platform.
            </p>
            <div
              className="flex flex-col sm:flex-row gap-4 justify-center animate-on-scroll animate-delay-200"
              data-animation="animate-fade-in-up"
            >
              <Button size="lg">
                {" "}
                {/* Uses default shadow */}
                Start Your Free Trial
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => scrollToSection("demo")}
                className="bg-transparent" // Remove explicit bg-transparent as it's handled by variant
              >
                {" "}
                {/* Uses outline shadow */}
                <Play className="mr-2 h-5 w-5" />
                Try Demo First
              </Button>
            </div>
            <p
              className="text-sm text-gray-400 animate-on-scroll animate-delay-300"
              data-animation="animate-fade-in-up"
            >
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Brain className="h-6 w-6 text-blue-400" />
                <span className="text-lg font-bold">AMCraft</span>
              </div>
              <p className="text-gray-400 text-sm">
                The ultimate platform for AMC 10/12 preparation through intelligent, adaptive practice.
              </p>
            </div>

            {Object.entries(footerLinks).map(([category, links]) => (
              <div key={category}>
                <h3 className="font-semibold text-white mb-4">{category}</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  {links.map((link) => (
                    <li key={link}>
                      <a href="#" className="hover:text-white transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} AMCraft. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
