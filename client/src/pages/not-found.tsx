import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  User, 
  Target, 
  GraduationCap, 
  Calculator,
  ChevronRight,
  ChevronLeft,
  Check,
  Trophy,
  Clock,
  BookOpen,
  Brain,
  Zap,
  TrendingUp,
  ArrowRight,
  Medal,
  Users,
  BarChart3,
  Calendar
} from "lucide-react"
import { cn } from "../../lib/utils"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Label } from "../components/ui/label"

interface OnboardingData {
  displayName: string;
  grade: string;
  school: string;
  currentAMCLevel: string[];
  mathBackground: string;
  previousAMCExperience: string;
  currentAMCScore: string;
  targetScore: string;
  studyGoals: string[];
  weakAreas: string[];
  studyTime: string;
  preferredLearningStyle: string;
  competitionTimeline: string;
}

const OnboardingPage = ({
  className,
  onComplete,
  ...props
}: React.ComponentProps<"div"> & {
  onComplete?: (data: OnboardingData) => void;
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState<OnboardingData>({
    displayName: '',
    grade: '',
    school: '',
    currentAMCLevel: [],
    mathBackground: '',
    previousAMCExperience: '',
    currentAMCScore: '',
    targetScore: '',
    studyGoals: [],
    weakAreas: [],
    studyTime: '',
    preferredLearningStyle: '',
    competitionTimeline: ''
  });

  const totalSteps = 6;

  // AMC Competition levels
  const amcLevelOptions = [
    { id: 'amc8', label: 'AMC 8', description: 'Middle school (Grade 8 and below)', icon: GraduationCap },
    { id: 'amc10', label: 'AMC 10', description: 'High school (Grade 10 and below)', icon: Calculator },
    { id: 'amc12', label: 'AMC 12', description: 'High school (Grade 12 and below)', icon: BookOpen },
    { id: 'aime', label: 'AIME', description: 'Advanced level (qualify via AMC 10/12)', icon: Trophy }
  ];

  // Math background levels
  const mathBackgroundOptions = [
    { id: 'pre-algebra', label: 'Pre-Algebra', description: 'Basic arithmetic and intro algebra' },
    { id: 'algebra1', label: 'Algebra I', description: 'Linear equations, polynomials' },
    { id: 'geometry', label: 'Geometry', description: 'Shapes, proofs, coordinate geometry' },
    { id: 'algebra2', label: 'Algebra II', description: 'Advanced algebra, trigonometry' },
    { id: 'precalculus', label: 'Pre-Calculus', description: 'Functions, sequences, limits' },
    { id: 'calculus', label: 'Calculus', description: 'Derivatives, integrals, applications' }
  ];

  // Previous AMC experience
  const experienceOptions = [
    { id: 'first-time', label: 'First Time', description: 'This will be my first AMC' },
    { id: 'participated', label: 'Participated Before', description: 'I\'ve taken AMC tests before' },
    { id: 'qualified-aime', label: 'AIME Qualifier', description: 'I\'ve qualified for AIME' },
    { id: 'aime-veteran', label: 'AIME Veteran', description: 'I regularly compete in AIME' }
  ];

  // Study goals
  const studyGoalOptions = [
    { id: 'improve-score', label: 'Improve My Score', icon: TrendingUp },
    { id: 'qualify-aime', label: 'Qualify for AIME', icon: Medal },
    { id: 'master-concepts', label: 'Master Key Concepts', icon: Brain },
    { id: 'speed-accuracy', label: 'Increase Speed & Accuracy', icon: Zap },
    { id: 'problem-solving', label: 'Develop Problem-Solving Skills', icon: Target },
    { id: 'contest-strategy', label: 'Learn Contest Strategy', icon: BarChart3 }
  ];

  // Common weak areas in AMC
  const weakAreaOptions = [
    { id: 'number-theory', label: 'Number Theory' },
    { id: 'combinatorics', label: 'Combinatorics & Counting' },
    { id: 'geometry', label: 'Geometry & Coordinate Geometry' },
    { id: 'algebra', label: 'Algebra & Functions' },
    { id: 'probability', label: 'Probability & Statistics' },
    { id: 'sequences-series', label: 'Sequences & Series' },
    { id: 'logic-reasoning', label: 'Logic & Reasoning' },
    { id: 'time-management', label: 'Time Management' }
  ];

  // Study time commitments
  const studyTimeOptions = [
    { id: '1-2-hours', label: '1-2 hours/week', description: 'Light preparation' },
    { id: '3-5-hours', label: '3-5 hours/week', description: 'Moderate preparation' },
    { id: '6-10-hours', label: '6-10 hours/week', description: 'Serious preparation' },
    { id: '10-plus-hours', label: '10+ hours/week', description: 'Intensive preparation' }
  ];

  // Learning style preferences
  const learningStyleOptions = [
    { id: 'video-lessons', label: 'Video Lessons', description: 'Learn through explanations and walkthroughs' },
    { id: 'practice-problems', label: 'Practice Problems', description: 'Learn by solving lots of problems' },
    { id: 'concept-review', label: 'Concept Review', description: 'Study theory then apply to problems' },
    { id: 'timed-practice', label: 'Timed Practice', description: 'Simulate real competition conditions' }
  ];

  // Competition timeline
  const timelineOptions = [
    { id: 'next-amc', label: 'Next AMC (November 2025)', description: 'Preparing for upcoming competition' },
    { id: 'spring-2026', label: 'Spring 2026', description: 'Long-term preparation' },
    { id: 'no-rush', label: 'No Specific Timeline', description: 'Building skills at my own pace' },
    { id: 'multiple-years', label: 'Multi-Year Plan', description: 'Long-term competitive math journey' }
  ];

  // Grade options
  const gradeOptions = [
    { id: '6', label: '6th Grade' },
    { id: '7', label: '7th Grade' },
    { id: '8', label: '8th Grade' },
    { id: '9', label: '9th Grade' },
    { id: '10', label: '10th Grade' },
    { id: '11', label: '11th Grade' },
    { id: '12', label: '12th Grade' },
    { id: 'college', label: 'College/University' },
    { id: 'other', label: 'Other' }
  ];

  const handleMultiSelect = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => {
      const currentArray = prev[field] as string[];
      const newArray = currentArray.includes(value)
        ? currentArray.filter(item => item !== value)
        : [...currentArray, value];
      
      return { ...prev, [field]: newArray };
    });
  };

  const handleSingleSelect = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleInputChange = (field: keyof OnboardingData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      console.log('Saving AMC training profile:', formData);
      
      // Here you would save to your database
      // await saveUserAMCProfile(formData);
      
      // Simulate loading time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      if (onComplete) {
        onComplete(formData);
      } else {
        console.log('AMC training profile completed, redirect to dashboard');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.displayName.trim().length > 0 && formData.grade.length > 0;
      case 2:
        return formData.currentAMCLevel.length > 0;
      case 3:
        return formData.mathBackground.length > 0 && formData.previousAMCExperience.length > 0;
      case 4:
        return formData.studyGoals.length > 0;
      case 5:
        return formData.studyTime.length > 0 && formData.preferredLearningStyle.length > 0;
      case 6:
        return formData.competitionTimeline.length > 0;
      default:
        return false;
    }
  };

  const stepVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    })
  };

  const OptionCard = ({ 
    option, 
    isSelected, 
    onClick, 
    multiSelect = false,
    variant = "default"
  }: { 
    option: any, 
    isSelected: boolean, 
    onClick: () => void,
    multiSelect?: boolean,
    variant?: "default" | "compact"
  }) => (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "border rounded-lg cursor-pointer transition-all duration-200",
        variant === "compact" ? "p-3" : "p-4",
        isSelected 
          ? "border-blue-500 bg-blue-50 shadow-md" 
          : "border-gray-200 hover:border-blue-300 hover:bg-blue-25"
      )}
    >
      <div className="flex items-center gap-3">
        {option.icon && <option.icon className={cn("w-5 h-5", isSelected ? "text-blue-600" : "text-gray-500")} />}
        <div className="flex-1">
          <div className={cn("font-medium font-noto-serif-jp", isSelected ? "text-blue-900" : "text-gray-700")}>
            {option.label}
          </div>
          {option.description && (
            <div className={cn("text-sm font-noto-serif-jp", isSelected ? "text-blue-600" : "text-gray-500")}>
              {option.description}
            </div>
          )}
        </div>
        {multiSelect && isSelected && (
          <Check className="w-5 h-5 text-blue-600" />
        )}
      </div>
    </motion.div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 font-noto-serif-jp">
                Welcome to AMCraft!
              </h2>
              <p className="text-gray-600 font-noto-serif-jp">
                Your personalized AMC math competition training platform
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="displayName" className="text-gray-700 font-noto-serif-jp font-medium">
                  What should we call you?
                </Label>
                <Input
                  id="displayName"
                  type="text"
                  placeholder="Your name or nickname"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>

              <div>
                <Label className="text-gray-700 font-noto-serif-jp font-medium mb-3 block">
                  What grade are you in?
                </Label>
                <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                  {gradeOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant={formData.grade === option.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSingleSelect('grade', option.id)}
                      className={cn(
                        "font-noto-serif-jp text-xs",
                        formData.grade === option.id 
                          ? "bg-blue-500 hover:bg-blue-600" 
                          : "hover:border-blue-300"
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="school" className="text-gray-700 font-noto-serif-jp font-medium">
                  What school do you attend? (Optional)
                </Label>
                <Input
                  id="school"
                  type="text"
                  placeholder="Your school name"
                  value={formData.school}
                  onChange={(e) => handleInputChange('school', e.target.value)}
                  className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 font-noto-serif-jp">
                Which AMC competitions are you targeting?
              </h2>
              <p className="text-gray-600 font-noto-serif-jp">
                Select all competitions you're preparing for
              </p>
            </div>

            <div className="space-y-3">
              {amcLevelOptions.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  isSelected={formData.currentAMCLevel.includes(option.id)}
                  onClick={() => handleMultiSelect('currentAMCLevel', option.id)}
                  multiSelect={true}
                />
              ))}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 font-noto-serif-jp">
                Tell us about your math background
              </h2>
              <p className="text-gray-600 font-noto-serif-jp">
                This helps us recommend the right content for you
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-gray-700 font-noto-serif-jp font-medium mb-3 block">
                  Highest math course completed
                </Label>
                <div className="space-y-3">
                  {mathBackgroundOptions.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      isSelected={formData.mathBackground === option.id}
                      onClick={() => handleSingleSelect('mathBackground', option.id)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-700 font-noto-serif-jp font-medium mb-3 block">
                  Previous AMC experience
                </Label>
                <div className="space-y-3">
                  {experienceOptions.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      isSelected={formData.previousAMCExperience === option.id}
                      onClick={() => handleSingleSelect('previousAMCExperience', option.id)}
                    />
                  ))}
                </div>
              </div>

              {formData.previousAMCExperience === 'participated' || 
               formData.previousAMCExperience === 'qualified-aime' || 
               formData.previousAMCExperience === 'aime-veteran' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currentScore" className="text-gray-700 font-noto-serif-jp font-medium">
                      Best AMC score (if known)
                    </Label>
                    <Input
                      id="currentScore"
                      type="number"
                      placeholder="e.g., 108"
                      value={formData.currentAMCScore}
                      onChange={(e) => handleInputChange('currentAMCScore', e.target.value)}
                      className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetScore" className="text-gray-700 font-noto-serif-jp font-medium">
                      Target score
                    </Label>
                    <Input
                      id="targetScore"
                      type="number"
                      placeholder="e.g., 120"
                      value={formData.targetScore}
                      onChange={(e) => handleInputChange('targetScore', e.target.value)}
                      className="mt-2 border-gray-200 focus:border-blue-400 focus:ring-blue-400/20"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 font-noto-serif-jp">
                What are your study goals?
              </h2>
              <p className="text-gray-600 font-noto-serif-jp">
                Select all that apply to customize your training plan
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {studyGoalOptions.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  isSelected={formData.studyGoals.includes(option.id)}
                  onClick={() => handleMultiSelect('studyGoals', option.id)}
                  multiSelect={true}
                />
              ))}
            </div>
          </motion.div>
        );

      case 5:
        return (
          <motion.div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 font-noto-serif-jp">
                How do you prefer to learn?
              </h2>
              <p className="text-gray-600 font-noto-serif-jp">
                We'll adapt our teaching approach to match your style
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-gray-700 font-noto-serif-jp font-medium mb-3 block">
                  How much time can you dedicate to AMC preparation?
                </Label>
                <div className="space-y-3">
                  {studyTimeOptions.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      isSelected={formData.studyTime === option.id}
                      onClick={() => handleSingleSelect('studyTime', option.id)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-700 font-noto-serif-jp font-medium mb-3 block">
                  Preferred learning style
                </Label>
                <div className="space-y-3">
                  {learningStyleOptions.map((option) => (
                    <OptionCard
                      key={option.id}
                      option={option}
                      isSelected={formData.preferredLearningStyle === option.id}
                      onClick={() => handleSingleSelect('preferredLearningStyle', option.id)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-gray-700 font-noto-serif-jp font-medium mb-3 block">
                  Areas you'd like to improve (Optional)
                </Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {weakAreaOptions.map((option) => (
                    <Button
                      key={option.id}
                      variant={formData.weakAreas.includes(option.id) ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleMultiSelect('weakAreas', option.id)}
                      className={cn(
                        "font-noto-serif-jp text-xs h-auto py-2 px-3",
                        formData.weakAreas.includes(option.id) 
                          ? "bg-blue-500 hover:bg-blue-600" 
                          : "hover:border-blue-300"
                      )}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        );

      case 6:
        return (
          <motion.div className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2 font-noto-serif-jp">
                When are you planning to compete?
              </h2>
              <p className="text-gray-600 font-noto-serif-jp">
                This helps us create your optimal study schedule
              </p>
            </div>

            <div className="space-y-3">
              {timelineOptions.map((option) => (
                <OptionCard
                  key={option.id}
                  option={option}
                  isSelected={formData.competitionTimeline === option.id}
                  onClick={() => handleSingleSelect('competitionTimeline', option.id)}
                />
              ))}
            </div>

            {/* Summary Preview */}
            <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <h3 className="font-semibold text-gray-800 mb-3 font-noto-serif-jp">
                🎯 Your AMC Training Profile Summary:
              </h3>
              <div className="space-y-2 text-sm text-gray-700 font-noto-serif-jp">
                <p><strong>Name:</strong> {formData.displayName}</p>
                <p><strong>Grade:</strong> {gradeOptions.find(g => g.id === formData.grade)?.label}</p>
                <p><strong>Target Competitions:</strong> {formData.currentAMCLevel.map(level => 
                  amcLevelOptions.find(opt => opt.id === level)?.label
                ).join(', ')}</p>
                <p><strong>Math Background:</strong> {mathBackgroundOptions.find(bg => bg.id === formData.mathBackground)?.label}</p>
                <p><strong>Goals:</strong> {formData.studyGoals.length} selected</p>
                <p><strong>Study Time:</strong> {studyTimeOptions.find(st => st.id === formData.studyTime)?.label}</p>
              </div>
            </div>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800 flex items-center justify-center p-4">
      <div className={cn("flex flex-col gap-6 w-full max-w-4xl", className)} {...props}>
        {/* Progress Bar */}
        <div className="w-full bg-white/20 rounded-full h-3 backdrop-blur-sm">
          <motion.div 
            className="bg-gradient-to-r from-green-400 to-blue-400 h-3 rounded-full shadow-lg"
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <Card className="overflow-hidden shadow-2xl backdrop-blur-sm bg-white/95 border-white/20">
          <CardContent className="p-8">
            <div className="min-h-[600px] flex flex-col">
              {/* Step Content */}
              <AnimatePresence mode="wait" custom={currentStep}>
                <motion.div
                  key={currentStep}
                  custom={currentStep}
                  variants={stepVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: "spring", stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 }
                  }}
                  className="flex-1"
                >
                  {renderStepContent()}
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                <Button
                  variant="ghost"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className="text-gray-600 hover:text-gray-800 font-noto-serif-jp"
                >
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-all duration-200",
                        i + 1 === currentStep 
                          ? "bg-blue-500 w-8" 
                          : i + 1 < currentStep 
                            ? "bg-green-500" 
                            : "bg-gray-300"
                      )}
                    />
                  ))}
                </div>

                {currentStep < totalSteps ? (
                  <motion.div
                    variants={{
                      hover: { scale: 1.05 },
                      tap: { scale: 0.95 }
                    }}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button
                      onClick={nextStep}
                      disabled={!canProceed()}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-noto-serif-jp"
                    >
                      Next Step
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    variants={{
                      hover: { scale: 1.05 },
                      tap: { scale: 0.95 }
                    }}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button
                      onClick={handleSubmit}
                      disabled={!canProceed() || isSubmitting}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-noto-serif-jp min-w-[160px]"
                    >
                      {isSubmitting ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                          />
                          Creating Profile...
                        </>
                      ) : (
                        <>
                          Start Training!
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step Indicator */}
        <div className="text-center text-white/70 font-noto-serif-jp text-sm">
          Step {currentStep} of {totalSteps} • Setting up your personalized AMC training experience
        </div>
      </div>
    </div>
  );
};

export default OnboardingPage;