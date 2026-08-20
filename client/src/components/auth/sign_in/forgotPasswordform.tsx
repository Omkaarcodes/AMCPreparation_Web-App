import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { 
  getAuth, 
  sendPasswordResetEmail,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { cn } from "../../../../lib/utils"
import { Button } from "../../ui/button"
import { Card, CardContent } from "../../ui/card"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { ArrowLeft, Mail, CheckCircle, AlertCircle, User } from "lucide-react"

const ForgotPasswordForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {
  const navigate = useNavigate();
  const auth = getAuth();

  const handleBackToLogin = () => {
    navigate('/login')
  }

  const handleBackToHome = () => {
    navigate('/')
  }

  const handleSignUp = () => {
    navigate('/sign-up')
  }

  // State variables
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userNotFound, setUserNotFound] = useState(false);

  // Animation state for inputs
  const [emailFocused, setEmailFocused] = useState(false);

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setUserNotFound(false);

    try {
        await sendPasswordResetEmail(auth, email);
        setSuccess(true);
        setEmailSent(true);
        setError('');
        setUserNotFound(false);
} catch (error) {
      let errorMessage = 'Failed to send password reset email. Please try again.';
      if (error === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else if (error === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      }
      setError(errorMessage);
      setSuccess(false);
}
      setLoading(false);
  };

  // Enhanced animation variants for input fields
  const inputContainerVariants = {
    initial: {
      scale: 1,
      rotateX: 0,
    },
    focus: {
      scale: 1.02,
      rotateX: 2,
      transition: { 
        duration: 0.3,
        ease: "easeOut"
      }
    },
    blur: {
      scale: 1,
      rotateX: 0,
      transition: { 
        duration: 0.3,
        ease: "easeInOut"
      }
    },
    error: {
      scale: [1, 1.02, 0.98, 1],
      x: [-2, 2, -2, 2, 0],
      transition: { 
        duration: 0.5,
        ease: "easeInOut"
      }
    }
  };

  const inputVariants = {
    initial: {
      borderColor: "#e5e7eb",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
    },
    focus: {
      borderColor: "#a855f7",
      boxShadow: "0 0 0 3px rgba(168, 85, 247, 0.1), 0 4px 12px 0 rgba(168, 85, 247, 0.15)",
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    },
    blur: {
      borderColor: "#e5e7eb",
      boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.1)",
      transition: { 
        duration: 0.2,
        ease: "easeInOut"
      }
    },
    typing: {
      borderColor: "#8b5cf6",
      boxShadow: "0 0 0 2px rgba(139, 92, 246, 0.2), 0 4px 12px 0 rgba(139, 92, 246, 0.1)",
      transition: { 
        duration: 0.15,
        ease: "easeOut"
      }
    },
    error: {
      borderColor: "#ef4444",
      boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.2), 0 4px 12px 0 rgba(239, 68, 68, 0.1)",
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const labelVariants = {
    initial: {
      color: "#6b7280",
      y: 0,
      scale: 1,
    },
    focus: {
      color: "#a855f7",
      y: -2,
      scale: 1.02,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    },
    blur: {
      color: "#6b7280",
      y: 0,
      scale: 1,
      transition: { 
        duration: 0.2,
        ease: "easeInOut"
      }
    },
    error: {
      color: "#ef4444",
      y: -2,
      scale: 1.02,
      transition: { 
        duration: 0.2,
        ease: "easeOut"
      }
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      y: -1,
      transition: { duration: 0.2 }
    },
    tap: {
      scale: 0.98,
      y: 0,
      transition: { duration: 0.1 }
    }
  };

  // Stagger animation for form elements
  const formVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        staggerChildren: 0.1,
        ease: "easeOut"
      }
    }
  };

  const itemVariants = {
    hidden: {
      opacity: 0,
      y: 20,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    }
  };

  // Helper function to get input state
  const getInputState = (isFocused: boolean, value: string) => {
    if (error) {
      return 'error';
    }
    
    if (isFocused) {
      return value ? 'typing' : 'focus';
    }
    
    return 'blur';
  };

  // Success state - email sent
  if (emailSent && success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800 flex items-center justify-center p-4">
        <div className={cn("flex flex-col gap-6 w-full max-w-md", className)} {...props}>
          <Button
            variant="ghost"
            className="self-start text-white hover:bg-white/10 mb-4 font-noto-serif-jp"
            onClick={handleBackToHome}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Landing Page
          </Button>

          <Card className="overflow-hidden shadow-2xl backdrop-blur-sm bg-white/95 border-white/20">
            <CardContent className="p-8">
              <motion.div 
                className="flex flex-col items-center gap-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                </motion.div>
                
                <div>
                  <h1 className="font-noto-serif-jp text-2xl font-bold text-gray-800 mb-2">
                    Password Reset Email Sent!
                  </h1>
                  <p className="font-noto-serif-jp text-gray-600 mb-4">
                    We've sent a password reset link to:
                  </p>
                  <p className="font-noto-serif-jp text-purple-600 font-medium">
                    {email}
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800 font-noto-serif-jp">
                    Please check your email linked to your AMCraft account and click the provided link to reset your password. 
                    The link will expire in 1 hour for security reasons.
                  </p>
                </div>
                
                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className="w-full"
                >
                  <Button 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-noto-serif-jp"
                    onClick={handleBackToLogin}
                  >
                    Back to Sign In
                  </Button>
                </motion.div>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // User not found state
  if (userNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800 flex items-center justify-center p-4">
        <div className={cn("flex flex-col gap-6 w-full max-w-md", className)} {...props}>
          <Button
            variant="ghost"
            className="self-start text-white hover:bg-white/10 mb-4 font-noto-serif-jp"
            onClick={handleBackToHome}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Landing Page
          </Button>

          <Card className="overflow-hidden shadow-2xl backdrop-blur-sm bg-white/95 border-white/20">
            <CardContent className="p-8">
              <motion.div 
                className="flex flex-col items-center gap-6 text-center"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, duration: 0.5, type: "spring" }}
                >
                  <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                    <User className="w-8 h-8 text-orange-600" />
                  </div>
                </motion.div>
                
                <div>
                  <h1 className="font-noto-serif-jp text-2xl font-bold text-gray-800 mb-2">
                    Account Not Found
                  </h1>
                  <p className="font-noto-serif-jp text-gray-600 mb-4">
                    No account found with the email:
                  </p>
                  <p className="font-noto-serif-jp text-orange-600 font-medium">
                    {email}
                  </p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-800 font-noto-serif-jp">
                    This email address is not registered with AMCraft. 
                    Please check your email or create a new account.
                  </p>
                </div>
                
                <div className="flex flex-col gap-3 w-full">
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button 
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-noto-serif-jp"
                      onClick={handleSignUp}
                    >
                      Create New Account
                    </Button>
                  </motion.div>
                  
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    <Button 
                      variant="outline"
                      className="w-full font-noto-serif-jp"
                      onClick={() => {
                        setUserNotFound(false);
                        setEmail('');
                        setError('');
                      }}
                    >
                      Try Different Email
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Main forgot password form
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-blue-600 to-indigo-800 flex items-center justify-center p-4">
      <div className={cn("flex flex-col gap-6 w-full max-w-4xl", className)} {...props}>
        <Button
          variant="ghost"
          className="self-start text-white hover:bg-white/10 mb-4 font-noto-serif-jp"
          onClick={handleBackToHome}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Landing Page
        </Button>

        <Card className="overflow-hidden shadow-2xl backdrop-blur-sm bg-white/95 border-white/20">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-6 md:p-8">
              <motion.div 
                className="flex flex-col gap-6"
                variants={formVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div 
                  className="flex flex-col items-center text-center"
                  variants={itemVariants}
                >
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                    <Mail className="w-6 h-6 text-purple-600" />
                  </div>
                  <h1 className="font-noto-serif-jp text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Forgot Password?
                  </h1>
                  <p className="font-noto-serif-jp text-balance text-muted-foreground">
                    Enter your email address and we'll send you a link to reset your password
                  </p>
                </motion.div>
                
                {/* Error message display with animation */}
                {error && (
                  <motion.div 
                    className="p-3 bg-red-50 border border-red-200 rounded-md"
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
                    <p className="text-sm text-red-600">{error}</p>
                  </motion.div>
                )}
                
                {/* Email Input Field */}
                <motion.div 
                  className="grid gap-2"
                  variants={itemVariants}
                >
                  <motion.div
                    variants={labelVariants}
                    animate={
                      error ? 'error' :
                      emailFocused ? "focus" : "blur"
                    }
                    initial="initial"
                  >
                    <Label htmlFor="email" className="text-gray-700 font-noto-serif-jp">
                      Email Address
                    </Label>
                  </motion.div>
                  
                  <motion.div
                    variants={inputContainerVariants}
                    animate={
                      error ? "error" : 
                      emailFocused ? "focus" : "blur"
                    }
                    initial="initial"
                    style={{ perspective: "1000px" }}
                  >
                    <motion.div
                      variants={inputVariants}
                      animate={getInputState(emailFocused, email)}
                      initial="initial"
                    >
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email address"
                        required
                        className="shadow-md border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 transition-all duration-200"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        onKeyDown={(e) => e.key === 'Enter' && handlePasswordReset()}
                      />
                    </motion.div>
                  </motion.div>
                </motion.div>

                <motion.div
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 text-white font-medium py-2.5 font-noto-serif-jp"
                    onClick={handlePasswordReset}
                    disabled={loading}
                  >
                    {loading ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                    ) : null}
                    {loading ? 'Sending Reset Link...' : 'Send Reset Link'}
                  </Button>
                </motion.div>

                <motion.div 
                  className="text-center text-sm font-noto-serif-jp text-gray-600"
                  variants={itemVariants}
                >
                  Remember your password?{" "}
                  <motion.a 
                    href="#" 
                    className="underline underline-offset-4 text-purple-600 hover:text-purple-700 transition-colors" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleBackToLogin();
                    }}
                    whileHover={{ 
                      scale: 1.05, 
                      color: "#7c3aed",
                      y: -1
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    Back to Sign In
                  </motion.a>
                </motion.div>

                <motion.div 
                  className="text-center text-sm font-noto-serif-jp text-gray-600"
                  variants={itemVariants}
                >
                  Don't have an account?{" "}
                  <motion.a 
                    href="#" 
                    className="underline underline-offset-4 text-purple-600 hover:text-purple-700 transition-colors" 
                    onClick={(e) => {
                      e.preventDefault();
                      handleSignUp();
                    }}
                    whileHover={{ 
                      scale: 1.05, 
                      color: "#7c3aed",
                      y: -1
                    }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    Sign up
                  </motion.a>
                </motion.div>
              </motion.div>
            </div>

            <div className="relative hidden md:block h-full w-full">
              <img
              src="attached_assets/download.jpeg"
              alt="Image"
              className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale rounded-r-lg"
              style={{ maxHeight: "100%", maxWidth: "100%" }}
              />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10"></div>
            </div>
          </CardContent>
        </Card>

        <div className="text-balance text-center text-xs text-white/70 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-white [&_a]:text-white/90 transition-colors">
          By using our service, you agree to our <a href="#">Terms of Service</a>{" "}
          and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordForm