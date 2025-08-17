import { Button } from "../components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "../components/ui/infocard"
import { Badge } from "../components/ui/badge"
import * as THREE from 'three'
import { motion, useScroll, useTransform, useInView } from "framer-motion"
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
import { useEffect, useRef, useState } from "react"
import InteractiveDemo from "../components/ui/InteractiveDemo"
import { useNavigate } from "react-router-dom"

export default function LandingPage() {
  const navigate = useNavigate()
  const { scrollYProgress } = useScroll()

  // Parallax transforms
  const yBg = useTransform(scrollYProgress, [0, 1], ['0%', '50%'])
  const yText = useTransform(scrollYProgress, [0, 1], ['0%', '100%'])

  const features = [
    {
      icon: Brain,
      title: "Adaptive Quizzes",
      description: "AI-powered difficulty adjustment based on your performance and learning patterns.",
      color: "text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      icon: Repeat,
      title: "Spaced Repetition",
      description: "Scientifically-backed review system for long-term retention of concepts and techniques.",
      color: "text-green-400",
      gradient: "from-green-500 to-emerald-500",
    },
    {
      icon: BarChart3,
      title: "Detailed Analytics",
      description: "Visualize accuracy, speed, and progress by topic with comprehensive performance insights.",
      color: "text-purple-400",
      gradient: "from-purple-500 to-pink-500",
    },
    {
      icon: BookOpen,
      title: "Error Journal",
      description: "Track and review mistakes with personalized explanations and similar problem recommendations.",
      color: "text-red-400",
      gradient: "from-red-500 to-orange-500",
    },
    {
      icon: Timer,
      title: "Mock Exams",
      description: "Full-length timed practice tests that simulate real AMC conditions and timing.",
      color: "text-yellow-400",
      gradient: "from-yellow-500 to-amber-500",
    },
    {
      icon: Target,
      title: "Mastery Heatmaps",
      description: "Visual representation of your strengths and weaknesses across all AMC topics.",
      color: "text-cyan-400",
      gradient: "from-cyan-500 to-blue-500",
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
    { value: "4,000+", label: "Practice Problems", color: "text-blue-400" },
    { value: "30%+", label: "Score Improvement", color: "text-green-400" },
    { value: "1,000+", label: "Students Helped", color: "text-purple-400" },
  ]

  const footerLinks = {
    Product: ["Features", "Demo"],
    Resources: ["Documentation", "Blog", "Help Center", "Community"],
    Company: ["About", "Privacy", "Terms"],
  }

  const scrollToSection = (id: string) => {
    const section = document.getElementById(id)
    if (section) {
      section.scrollIntoView({ behavior: "smooth" })
    }
  }

  const globalStyles = `
    * {
      font-family: 'Noto Serif JP', serif !important;
    }
    
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    
    @keyframes pulse-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(59, 130, 246, 0.3); }
      50% { box-shadow: 0 0 30px rgba(59, 130, 246, 0.6); }
    }

    @keyframes demo-slide-in {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes demo-fade-in {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes demo-scale-in {
      from {
        opacity: 0;
        transform: scale(0.9);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }

    .pulse-glow {
      animation: pulse-glow 2s ease-in-out infinite;
    }
    
    .shimmer {
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
      background-size: 200% 100%;
      animation: shimmer 2s infinite;
    }

    .demo-animate-in {
      animation: demo-slide-in 0.6s ease-out forwards;
    }

    .demo-fade-in {
      animation: demo-fade-in 0.8s ease-out forwards;
    }

    .demo-scale-in {
      animation: demo-scale-in 0.6s ease-out forwards;
    }
  `

  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.textContent = globalStyles
    document.head.appendChild(styleElement)
    
    return () => {
      document.head.removeChild(styleElement)
    }
  }, [])

  const handleSignIn = () => {
    navigate('/login')
  }

  const handleGetStarted = () => {
    navigate('/sign-up')
  }

  // Animation variants
  const fadeInUp = {
    hidden: { opacity: 0, y: 60 },
    visible: { opacity: 1, y: 0 }
  }

  const fadeInLeft = {
    hidden: { opacity: 0, x: -60 },
    visible: { opacity: 1, x: 0 }
  }

  const fadeInRight = {
    hidden: { opacity: 0, x: 60 },
    visible: { opacity: 1, x: 0 }
  }

  const scaleIn = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: { opacity: 1, scale: 1 }
  }

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 overflow-x-hidden">
      {/* Header */}
      <motion.header 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60 sticky top-0 z-50"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <motion.div 
              className="flex items-center space-x-2"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 400 }}
            >
              <Brain className="h-8 w-8 text-blue-400" />
              <span className="text-xl font-bold">AMCraft</span>
            </motion.div>
            
            <nav className="hidden md:flex items-center space-x-8">
              {["Features", "Demo", "About", "Suggest Ideas"].map((item, index) => (
                <motion.button
                  key={item}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 + 0.3 }}
                  onClick={() => scrollToSection(item.toLowerCase().replace(" ", ""))}
                  className="text-gray-300 hover:text-white transition-colors flex items-center space-x-1 relative group"
                  whileHover={{ scale: 1.05 }}
                >
                  {item === "Demo" && <Play className="h-4 w-4" />}
                  <span>{item}</span>
                  <motion.div
                    className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 group-hover:w-full transition-all duration-300"
                    layoutId="underline"
                  />
                </motion.button>
              ))}
            </nav>
            
            <motion.div 
              className="flex items-center space-x-4"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800" onClick={handleSignIn}>
                  Sign In
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button variant="ghost" className="text-gray-300 hover:text-white hover:bg-gray-800" onClick={handleGetStarted}>
                  Get Started
                </Button>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.div 
        className="relative h-screen bg-cover bg-center bg-no-repeat overflow-hidden" 
        style={{ backgroundImage: "url('/attached_assets/LandingPageBackground.jpeg')" }}
      >
        <motion.div 
          className="absolute inset-0 bg-black opacity-50"
          style={{ y: yBg }}
        />

        <section className="relative py-20 px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="container mx-auto max-w-6xl">
            <motion.div 
              className="text-center space-y-8"
              style={{ y: yText }}
            >
              <motion.div 
                className="space-y-4"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
              >
                <motion.h1
                  variants={fadeInUp}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="font-noto-serif-jp text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight"
                >
                  Master Math Competitions
                  <br />
                  <motion.span 
                    className="font-libertinus-math text-blue-400 inline-block"
                    animate={{ 
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{
                      background: "linear-gradient(45deg, #3b82f6, #06b6d4, #3b82f6)",
                      backgroundSize: "200% 200%",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    Through Intelligent Practice
                  </motion.span>
                </motion.h1>
                
                <motion.p
                  variants={fadeInUp}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="font-noto-serif-jp text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed"
                >
                  Transform your AMC prep with adaptive quizzes, spaced repetition, detailed analytics, and gamified
                  learning. Built for serious competitors who want to maximize their potential.
                </motion.p>
              </motion.div>

              <motion.div
                className="font-noto-serif-jp flex flex-col sm:flex-row gap-4 justify-center items-center"
                variants={fadeInUp}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.8, delay: 0.4 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05, boxShadow: "0 0 25px rgba(59, 130, 246, 0.5)" }}
                  whileTap={{ scale: 0.95 }}
                  className="pulse-glow"
                >
                  <Button size="lg" className="shimmer">
                    Start Practicing Free
                  </Button>
                </motion.div>
                
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => scrollToSection("demo")}
                    className="bg-transparent border-2 hover:bg-blue-600/20"
                  >
                    <Play className="mr-2 h-5 w-5" />
                    Try Demo
                  </Button>
                </motion.div>
              </motion.div>

              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto"
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.6 }}
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={index}
                    variants={scaleIn}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="text-center"
                    whileHover={{ scale: 1.1, y: -5 }}
                  >
                    <motion.div 
                      className={`text-3xl font-bold ${stat.color}`}
                      animate={{ 
                        textShadow: [
                          "0 0 10px currentColor", 
                          "0 0 20px currentColor", 
                          "0 0 10px currentColor"
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      {stat.value}
                    </motion.div>
                    <div className="text-gray-400">{stat.label}</div>
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          </div>
        </section>
      </motion.div>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center space-y-4 mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold"
            >
              Comprehensive Learning Platform
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              Every feature designed to accelerate your AMC performance through data-driven insights and engaging
              practice.
            </motion.p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            {features.map((feature, index) => {
              const IconComponent = feature.icon
              return (
                <motion.div
                  key={index}
                  variants={fadeInUp}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ 
                    scale: 1.05, 
                    y: -10,
                    boxShadow: "0 20px 40px rgba(0,0,0,0.3)"
                  }}
                  className="group"
                >
                  <Card className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-all duration-300 h-full relative overflow-hidden">
                    <motion.div
                      className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}
                    />
                    <CardHeader className="relative z-10">
                      <IconComponent className={`h-8 w-8 ${feature.color} mb-2`} />
                      <CardTitle className="text-white group-hover:text-blue-300 transition-colors">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="text-gray-400 group-hover:text-gray-300 transition-colors">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Gamification Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center space-y-4 mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold"
            >
              Gamified Learning Experience
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              Stay motivated with XP points, badges, streaks, and competitive features that make learning addictive.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <motion.div 
              className="space-y-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {gamificationFeatures.map((feature, index) => {
                const IconComponent = feature.icon
                return (
                  <motion.div
                    key={index}
                    variants={fadeInLeft}
                    transition={{ duration: 0.6, delay: index * 0.1 }}
                    className="flex items-start space-x-4 group"
                    whileHover={{ x: 10 }}
                  >
                    <motion.div 
                      className={`${feature.bgColor} p-3 rounded-lg shadow-lg ${feature.shadowColor}`}
                      whileHover={{ 
                        scale: 1.1, 
                        rotate: 5,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.3)" 
                      }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <IconComponent className="h-6 w-6 text-white" />
                    </motion.div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                        {feature.title}
                      </h3>
                      <p className="text-gray-400 group-hover:text-gray-300 transition-colors">
                        {feature.description}
                      </p>
                    </div>
                  </motion.div>
                )
              })}
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInRight}
              transition={{ duration: 0.8 }}
              whileHover={{ scale: 1.02, rotateY: 5 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 p-8 rounded-2xl border border-gray-700 shadow-2xl relative overflow-hidden"
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"
                animate={{ opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              <div className="space-y-6 relative z-10">
                <motion.div 
                  className="text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.div 
                    className="text-4xl font-bold text-blue-400 mb-2"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Level 12
                  </motion.div>
                  <div className="text-gray-400">Mathematical Warrior</div>
                  <div className="w-full bg-gray-700 rounded-full h-3 mt-4">
                    <motion.div 
                      className="bg-blue-600 h-3 rounded-full"
                      initial={{ width: "0%" }}
                      whileInView={{ width: "75%" }}
                      transition={{ duration: 2, ease: "easeOut" }}
                    />
                  </div>
                  <div className="text-sm text-gray-400 mt-2">2,340 / 3,000 XP</div>
                </motion.div>

                <motion.div 
                  className="grid grid-cols-2 gap-4"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  {[
                    { icon: Trophy, value: "15", label: "Badges Earned", color: "text-yellow-400" },
                    { icon: TrendingUp, value: "47", label: "Day Streak", color: "text-green-400" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      variants={scaleIn}
                      transition={{ delay: index * 0.2 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="bg-gray-700 p-4 rounded-lg text-center cursor-pointer"
                    >
                      <item.icon className={`h-6 w-6 ${item.color} mx-auto mb-2`} />
                      <motion.div 
                        className="text-lg font-bold text-white"
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: index * 0.3 }}
                      >
                        {item.value}
                      </motion.div>
                      <div className="text-sm text-gray-400">{item.label}</div>
                    </motion.div>
                  ))}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section - CSS Animations Only */}
      <section id="demo" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-4 mb-16 demo-fade-in">
            <h2 className="text-3xl sm:text-4xl font-bold">
              Try Our Platform Live
            </h2>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto">
              Experience our problem-solving system with this interactive demo. Solve real AMC problems and see
              how our platform provides instant feedback and explanations.
            </p>
          </div>

          <div className="max-w-4xl mx-auto demo-scale-in">
            <InteractiveDemo />
          </div>
        </div>
      </section>

      {/* About the Creator Section */}
      <section id="about" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="text-center space-y-4 mb-16"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold"
            >
              About the Creator
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-400 max-w-3xl mx-auto"
            >
              Built by a passionate mathematician and educator dedicated to making competition math accessible to
              everyone.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeInLeft}
              transition={{ duration: 0.8 }}
            >
              <motion.div 
                className="bg-gray-800 p-8 rounded-2xl border border-gray-700 relative overflow-hidden"
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-600/5 to-purple-600/5"
                  animate={{ opacity: [0.05, 0.15, 0.05] }}
                  transition={{ duration: 4, repeat: Infinity }}
                />
                
                <div className="flex items-center space-x-4 mb-6 relative z-10">
                  <motion.div 
                    className="w-20 h-20 bg-gradient-to-br from-blue-600 to-purple-600 rounded-full flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Brain className="h-10 w-10 text-white" />
                  </motion.div>
                  <div>
                    <h3 className="text-2xl font-bold text-white">Omkaar Sampigeadi</h3>
                    <p className="text-blue-400 font-medium">Founder & Lead Developer</p>
                  </div>
                </div>
                
                <div className="space-y-4 text-gray-300 relative z-10">
                  <p>
                    As a former AMC competitor who has qualified for the American Invitational Mathematics Examination (AIME), I understand the challenges
                    students face when preparing for math competitions. The lack of personalized, adaptive practice
                    tools motivated me to create AMCraft.
                  </p>
                  <p>
                    With a background in computer science and mathematics education, I've combined my passion for both
                    fields to build a platform that truly adapts to each student's learning journey.
                  </p>
                </div>
              </motion.div>
            </motion.div>

            <motion.div 
              className="grid grid-cols-2 gap-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={staggerContainer}
            >
              {[
                { icon: Trophy, value: "AIME", label: "Qualifier", detail: "2025", color: "text-yellow-400" },
                { icon: Users, value: "100+", label: "Students Tutored", detail: "Over 3 years", color: "text-green-400" },
                { icon: Star, value: "2023", label: "Teaching Since", detail: "Competition Math", color: "text-purple-400" }
              ].map((item, index) => (
                <motion.div
                  key={index}
                  variants={scaleIn}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -10 }}
                  className="bg-gray-800 p-6 rounded-lg text-center cursor-pointer group"
                >
                  <item.icon className={`h-8 w-8 ${item.color} mx-auto mb-3 group-hover:scale-110 transition-transform`} />
                  <div className="text-2xl font-bold text-white group-hover:text-blue-300 transition-colors">{item.value}</div>
                  <div className="text-gray-400 group-hover:text-gray-300 transition-colors">{item.label}</div>
                  <div className="text-sm text-gray-500 mt-1">{item.detail}</div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div 
            className="text-center"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Card className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 border-blue-600/30 max-w-3xl mx-auto relative overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"
                  animate={{ x: ["-100%", "100%"] }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
                <CardHeader className="relative z-10">
                  <CardTitle className="text-white text-xl">My Mission</CardTitle>
                  <CardDescription className="text-gray-300 text-lg leading-relaxed">
                    I believe every student with mathematical curiosity deserves access to high-quality competition
                    preparation. AMCraft represents my commitment to democratizing math competition education through
                    technology, making it possible for students worldwide to reach their full potential regardless of
                    their geographic location or economic background.
                  </CardDescription>
                </CardHeader>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Suggest Ideas Section */}
      <section id="suggestideas" className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-800/50">
        <div className="container mx-auto max-w-4xl">
          <motion.div 
            className="text-center space-y-4 mb-12"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold"
            >
              Help Shape AMCraft
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-400 max-w-2xl mx-auto"
            >
              Your ideas and feedback are invaluable in making AMCraft the best possible platform for math competition
              preparation.
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            <Card className="bg-gray-800 border-gray-700 relative overflow-hidden">
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-yellow-500/5 to-orange-500/5"
                animate={{ opacity: [0.05, 0.15, 0.05] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
              
              <CardHeader className="text-center relative z-10">
                <motion.div 
                  className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4"
                  whileHover={{ scale: 1.1, rotate: 10 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <Lightbulb className="h-8 w-8 text-white" />
                </motion.div>
                <CardTitle className="text-white text-2xl">Share Your Ideas</CardTitle>
                <CardDescription className="text-gray-400 text-lg">
                  Whether it's a new feature, improvement suggestion, or feedback on your experience, we'd love to hear
                  from you.
                </CardDescription>
              </CardHeader>
              
              <div className="px-6 pb-6 relative z-10">
                <motion.div 
                  className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8"
                  variants={staggerContainer}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                >
                  {[
                    { title: "Feature Requests", desc: "Suggest new features that would enhance your learning experience" },
                    { title: "Problem Suggestions", desc: "Recommend specific topics or problem types you'd like to see" },
                    { title: "UI/UX Feedback", desc: "Help us improve the user interface and experience" },
                    { title: "General Feedback", desc: "Share your overall thoughts and suggestions" }
                  ].map((item, index) => (
                    <motion.div
                      key={index}
                      variants={scaleIn}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="bg-gray-700 p-4 rounded-lg cursor-pointer group"
                    >
                      <h4 className="text-white font-semibold mb-2 group-hover:text-yellow-400 transition-colors">{item.title}</h4>
                      <p className="text-gray-400 text-sm group-hover:text-gray-300 transition-colors">{item.desc}</p>
                    </motion.div>
                  ))}
                </motion.div>

                <div className="text-center space-y-4">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button
                      size="lg"
                      className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-8 py-3 text-lg relative overflow-hidden"
                      onClick={() => window.open("https://forms.gle/WtrSrTUfU3boLEhg6", "_blank")}
                    >
                      <motion.div
                        className="absolute inset-0 bg-white/20"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.5 }}
                      />
                      <Lightbulb className="mr-2 h-5 w-5 relative z-10" />
                      <span className="relative z-10">Submit Your Ideas</span>
                    </Button>
                  </motion.div>
                  <p className="text-sm text-gray-400">
                    Join our community of contributors helping to build the future of math competition preparation
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-blue-900/50 to-purple-900/50 relative overflow-hidden">
        <motion.div
          className="absolute inset-0"
          animate={{
            background: [
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 80% 50%, rgba(147, 51, 234, 0.1) 0%, transparent 50%)",
              "radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)"
            ]
          }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <motion.div 
            className="space-y-8"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-3xl sm:text-4xl font-bold"
            >
              Ready to Dominate the AMC?
            </motion.h2>
            <motion.p
              variants={fadeInUp}
              className="text-xl text-gray-300 max-w-2xl mx-auto"
            >
              Join thousands of students who have transformed their math competition performance with our intelligent
              practice platform.
            </motion.p>
            <motion.div
              className="flex flex-col sm:flex-row gap-4 justify-center"
              variants={fadeInUp}
            >
              <motion.div
                whileHover={{ scale: 1.05, boxShadow: "0 0 30px rgba(59, 130, 246, 0.5)" }}
                whileTap={{ scale: 0.95 }}
              >
                <Button size="lg" className="shimmer pulse-glow" onClick={handleGetStarted}>
                  Get Started
                </Button>
              </motion.div>
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => scrollToSection("demo")}
                  className="bg-transparent border-2 hover:bg-blue-600/20"
                >
                  <Play className="mr-2 h-5 w-5" />
                  Try Demo First
                </Button>
              </motion.div>
            </motion.div>
            <motion.p
              variants={fadeInUp}
              className="text-sm text-gray-400"
            >
              Start your journey towards AMC mastery today! No credit card required, just pure math practice!
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <motion.footer 
        className="bg-gray-900 border-t border-gray-800 py-12 px-4 sm:px-6 lg:px-8"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="container mx-auto max-w-6xl">
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-4 gap-8"
            variants={staggerContainer}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <motion.div 
              className="space-y-4"
              variants={fadeInUp}
            >
              <motion.div 
                className="flex items-center space-x-2"
                whileHover={{ scale: 1.05 }}
              >
                <Brain className="h-6 w-6 text-blue-400" />
                <span className="text-lg font-bold">AMCraft</span>
              </motion.div>
              <p className="text-gray-400 text-sm">
                The ultimate platform for AMC 10/12 preparation through intelligent, adaptive practice.
              </p>
            </motion.div>

            {Object.entries(footerLinks).map(([category, links], categoryIndex) => (
              <motion.div 
                key={category}
                variants={fadeInUp}
                transition={{ delay: categoryIndex * 0.1 }}
              >
                <h3 className="font-semibold text-white mb-4">{category}</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  {links.map((link, linkIndex) => (
                    <motion.li 
                      key={link}
                      whileHover={{ x: 5 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <a href="#" className="hover:text-white transition-colors">
                        {link}
                      </a>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
          >
            <p>&copy; {new Date().getFullYear()} AMCraft. All rights reserved.</p>
          </motion.div>
        </div>
      </motion.footer>
    </div>
  )
}