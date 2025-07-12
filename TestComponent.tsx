import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./client/src/components/ui/dropdown-menu"
import { User, Settings, CreditCard, Keyboard, Users, Plus, Github, HelpCircle, LogOut } from "lucide-react"

// Button component to match your design system
const Button = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "default" | "outline" | "ghost"
    size?: "default" | "sm" | "lg"
  }
>(({ className, variant = "default", size = "default", ...props }, ref) => {
  const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
  
  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm hover:shadow-md",
    outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground shadow-sm hover:shadow-md hover:scale-105 active:scale-95",
    ghost: "hover:bg-accent hover:text-accent-foreground"
  }
  
  const sizes = {
    default: "h-10 px-4 py-2",
    sm: "h-9 rounded-md px-3",
    lg: "h-11 rounded-md px-8"
  }
  
  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className || ''}`}
      ref={ref}
      {...props}
    />
  )
})
Button.displayName = "Button"

function DropdownMenuDemo() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <User className="h-4 w-4" />
          Open Menu
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-56 bg-popover/95 backdrop-blur-sm border border-border shadow-2xl rounded-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95" 
        align="start"
      >
        <DropdownMenuLabel className="text-popover-foreground font-semibold">My Account</DropdownMenuLabel>
        <DropdownMenuGroup>
          <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
            <User className="mr-2 h-4 w-4" />
            Profile
            <DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
            <DropdownMenuShortcut>⌘B</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
            <Settings className="mr-2 h-4 w-4" />
            Settings
            <DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
          </DropdownMenuItem>
          <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
            <Keyboard className="mr-2 h-4 w-4" />
            Keyboard shortcuts
            <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
            <Users className="mr-2 h-4 w-4" />
            Team
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
              <Plus className="mr-2 h-4 w-4" />
              Invite users
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="bg-popover/95 backdrop-blur-sm border border-border shadow-2xl rounded-lg animate-in fade-in-0 zoom-in-95">
                <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
                  Email
                </DropdownMenuItem>
                <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
                  Message
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
                  More...
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
          <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
            <Plus className="mr-2 h-4 w-4" />
            New Team
            <DropdownMenuShortcut>⌘+T</DropdownMenuShortcut>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
          <Github className="mr-2 h-4 w-4" />
          GitHub
        </DropdownMenuItem>
        <DropdownMenuItem className="transition-all duration-200 hover:bg-accent/80 cursor-pointer">
          <HelpCircle className="mr-2 h-4 w-4" />
          Support
        </DropdownMenuItem>
        <DropdownMenuItem disabled className="opacity-50 cursor-not-allowed">
          API
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="transition-all duration-200 hover:bg-destructive/10 hover:text-destructive cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
          <DropdownMenuShortcut>⇧⌘Q</DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function DropdownDemoWrapper() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4 animate-in fade-in-0 slide-in-from-top-4 duration-700">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Enhanced Dropdown Menu Demo
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            A styled dropdown menu with animations, proper opacity, and enhanced user experience
          </p>
        </div>

        {/* Demo Section */}
        <div className="flex justify-center items-center min-h-[400px]">
          <div className="p-8 bg-card/50 backdrop-blur-sm border border-border rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 animate-in fade-in-0 zoom-in-95 delay-300">
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-card-foreground">
                  Interactive Dropdown Menu
                </h2>
                <p className="text-muted-foreground text-sm">
                  Click the button below to explore the enhanced dropdown menu
                </p>
              </div>
              
              <div className="flex justify-center">
                <DropdownMenuDemo />
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>✨ Enhanced with backdrop blur and proper opacity</p>
                <p>🎨 Smooth animations and hover effects</p>
                <p>⌨️ Keyboard shortcuts and accessibility</p>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-700 delay-500">
          <div className="p-6 bg-card/30 backdrop-blur-sm border border-border rounded-xl hover:bg-card/50 transition-all duration-300">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Settings className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-card-foreground">Enhanced Styling</h3>
              <p className="text-sm text-muted-foreground">
                Proper opacity, backdrop blur, and shadow effects for better visual hierarchy
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-card/30 backdrop-blur-sm border border-border rounded-xl hover:bg-card/50 transition-all duration-300">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-card-foreground">Smooth Animations</h3>
              <p className="text-sm text-muted-foreground">
                Fluid entrance and exit animations with proper timing and easing
              </p>
            </div>
          </div>
          
          <div className="p-6 bg-card/30 backdrop-blur-sm border border-border rounded-xl hover:bg-card/50 transition-all duration-300">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Keyboard className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold text-card-foreground">Accessible Design</h3>
              <p className="text-sm text-muted-foreground">
                Keyboard navigation, proper focus states, and semantic markup
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}