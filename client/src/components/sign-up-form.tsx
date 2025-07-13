import { useEffect,useRef } from "react"
import { useNavigate } from "react-router-dom"
import { cn } from "../../lib/utils"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { ArrowLeft } from "lucide-react"
import { Sign } from "crypto"

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const navigate = useNavigate()

  const handleBackToHome = () => {
    navigate('/')
  }

  const handleLogin = () => {
    navigate('/login')
  }

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
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className=" font-noto-serif-jp text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                    Hello There!
                  </h1>
                  <p className=" font-noto-serif-jp text-balance text-muted-foreground">
                    Create your AMCraft account
                  </p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email" className="text-gray-700 font-noto-serif-jp">Your Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="abc@example.com"
                    required
                    className="shadow-md border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 transition-all duration-200"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password" className="text-gray-700 font-noto-serif-jp">Your Password</Label>
                    
                  </div>
                  <Input 
                    id="password" 
                    type="password" 
                    required 
                    className="shadow-md border-gray-200 focus:border-purple-400 focus:ring-purple-400/20 focus:ring-4 transition-all duration-200"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 text-white font-medium py-2.5 font-noto-serif-jp"
                >
                  Sign Up!
                </Button>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                  <span className="relative z-10 bg-white px-2 text-muted-foreground font-noto-serif-jp">
                    Or Sign Up With:
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  
                  <Button 
                      variant="outline" 
                      className="col-span-3 w-full shadow-md hover:shadow-lg transform hover:scale-[1.02] transition-all duration-200 border-gray-200 hover:border-gray-300 hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <img
                        src="/attached_assets/google-color-svgrepo-com.svg"
                        alt="Google"
                        className="w-5 h-5"
                      />
                      <span>Sign Up With Google</span>
                      <span className="sr-only">Login with Google</span>
                    </Button>
                  
                </div>
                <div className="text-center text-sm font-noto-serif-jp text-gray-600">
                  Already have an account?{" "}
                  <a href="#" className="underline underline-offset-4 text-purple-600 hover:text-purple-700 transition-colors" onClick={handleLogin}>
                    Sign in
                  </a>
                </div>
              </div>
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
export default SignUpForm