import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth';
import {authentification} from '../firebaseConfig';
import { cn } from "../../../../lib/utils"
import { Button } from "../../ui/button"
import { Card, CardContent } from "../../ui/card"
import { Input } from "../../ui/input"
import { Label } from "../../ui/label"
import { ArrowLeft } from "lucide-react"
import { get } from "http";

const LoginForm = ({
  className,
  ...props
}: React.ComponentProps<"div">) => {

  const navigate = useNavigate();
  const auth = getAuth();

  // State variables for managing authentication state, email, password, and error messages
  const [authing, setAuthing] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  
  // Animation state for inputs
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleBackToHome = () => {
    navigate('/')
  }

  const handleSignUp = () => {
    navigate('/sign-up')
  }
  
  // Function to handle sign-in with Google
    const signInWithGoogle = async () => {
        setAuthing(true);
        
        // Use Firebase to sign in with Google
        signInWithPopup(auth, new GoogleAuthProvider())
            .then(response => {
                console.log(response.user.uid);
                navigate('/');
            })
            .catch(error => {
                console.log(error);
                setAuthing(false);
            });
    }

    // Function to handle sign-in with email and password
    const signInWithEmail = async () => {
        setAuthing(true);
        setError('');

        // Use Firebase to sign in with email and password
        signInWithEmailAndPassword(auth, email, password)
            .then(response => {
                console.log(response.user.uid);
                navigate('/');
            })
            .catch(error => {
                console.log(error);
                setError(error.message);
                setAuthing(false);
            });
    }

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
                  <h1 className="font-noto-serif-jp text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Welcome back
                  </h1>
                  <p className="font-noto-serif-jp text-balance text-muted-foreground">
                    Login to your AMCraft account
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
                    animate={emailFocused ? "focus" : "blur"}
                    initial="initial"
                  >
                    <Label htmlFor="email" className="text-gray-700 font-noto-serif-jp">
                      Email
                    </Label>
                  </motion.div>
                  
                  <motion.div
                    variants={inputContainerVariants}
                    animate={
                      error && email ? "error" : 
                      emailFocused ? "focus" : "blur"
                    }
                    initial="initial"
                    style={{ perspective: "1000px" }}
                  >
                    <motion.div
                      variants={inputVariants}
                      animate={
                        emailFocused ? (email ? "typing" : "focus") : "blur"
                      }
                      initial="initial"
                    >
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        placeholder="abc@example.com"
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={() => setEmailFocused(true)}
                        onBlur={() => setEmailFocused(false)}
                        required
                        className="shadow-md border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 transition-all duration-200"
                      />
                    </motion.div>
                  </motion.div>
                </motion.div>

                {/* Password Input Field */}
                <motion.div 
                  className="grid gap-2"
                  variants={itemVariants}
                >
                  <div className="flex items-center">
                    <motion.div
                      variants={labelVariants}
                      animate={passwordFocused ? "focus" : "blur"}
                      initial="initial"
                    >
                      <Label htmlFor="password" className="text-gray-700 font-noto-serif-jp">
                        Password
                      </Label>
                    </motion.div>
                    <motion.a
                      href="#"
                      className="ml-auto text-sm underline-offset-2 hover:underline text-purple-600 hover:text-purple-700 transition-colors font-noto-serif-jp"
                      whileHover={{ 
                        scale: 1.05, 
                        color: "#7c3aed",
                        y: -1
                      }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      Forgot your password?
                    </motion.a>
                  </div>
                  
                  <motion.div
                    variants={inputContainerVariants}
                    animate={
                      error && password ? "error" : 
                      passwordFocused ? "focus" : "blur"
                    }
                    initial="initial"
                    style={{ perspective: "1000px" }}
                  >
                    <motion.div
                      variants={inputVariants}
                      animate={
                        passwordFocused ? (password ? "typing" : "focus") : "blur"
                      }
                      initial="initial"
                    >
                      <Input 
                        id="password" 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        placeholder='Password'
                        required 
                        className="shadow-md border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 transition-all duration-200"
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
                    onClick={signInWithEmail}
                    disabled={authing}
                  >
                    {authing ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"
                      />
                    ) : null}
                    {authing ? 'Logging in...' : 'Login'}
                  </Button>
                </motion.div>

                <motion.div 
                  className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border"
                  variants={itemVariants}
                >
                  <span className="relative z-10 bg-white px-2 text-muted-foreground font-noto-serif-jp">
                    Or continue with:
                  </span>
                </motion.div>

                <motion.div 
                  className="grid grid-cols-3 gap-4"
                  variants={itemVariants}
                >
                  <motion.div
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                    className="col-span-3"
                  >
                    <Button 
                      variant="outline" 
                      className="w-full shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
                      onClick={signInWithGoogle}
                      disabled={authing}
                    >
                      <img
                        src="/attached_assets/google-color-svgrepo-com.svg"
                        alt="Google"
                        className="w-5 h-5"
                      />
                      <span>{authing ? 'Signing in...' : 'Sign In With Google'}</span>
                      <span className="sr-only">Login with Google</span>
                    </Button>
                  </motion.div>
                </motion.div>

                <motion.div 
                  className="text-center text-sm font-noto-serif-jp text-gray-600"
                  variants={itemVariants}
                >
                  Don't have an account?{" "}
                  <motion.a 
                    href="#" 
                    className="underline underline-offset-4 text-purple-600 hover:text-purple-700 transition-colors" 
                    onClick={handleSignUp}
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

            <div className="relative hidden bg-gradient-to-br from-purple-400/20 to-blue-400/20 md:block">
              <img
                src="attached_assets/download.jpeg"
                alt="Image"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale max-h-[600px] rounded-r-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-purple-600/10 to-blue-600/10"></div>
            </div>
          </CardContent>
        </Card>

        <div className="text-balance text-center text-xs text-white/70 [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-white [&_a]:text-white/90 transition-colors">
          By clicking continue, you agree to our <a href="#">Terms of Service</a>{" "}
          and <a href="#">Privacy Policy</a>.
        </div>
      </div>
    </div>
  )
}

export default LoginForm