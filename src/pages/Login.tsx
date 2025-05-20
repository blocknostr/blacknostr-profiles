
import { LoginForm } from "@/components/auth/LoginForm";

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      {/* Blurred background effect */}
      <div className="absolute inset-0 w-full h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background/90 to-background/80 backdrop-blur-xl z-0"></div>
        <div className="absolute inset-0 flex flex-wrap gap-10 justify-center items-center opacity-30 z-[-1] overflow-hidden">
          {[...Array(10)].map((_, i) => (
            <div 
              key={i}
              className="w-64 h-64 rounded-full bg-nostr-blue/20 animate-pulse-light"
              style={{ 
                animationDelay: `${i * 0.2}s`,
                transform: `translate(${Math.random() * 100 - 50}px, ${Math.random() * 100 - 50}px)`
              }}
            ></div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="w-full max-w-md space-y-8 z-10">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gradient animate-fade-in">NOSTR App</h1>
          <p className="mt-2 text-muted-foreground">
            Connect to the decentralized social network
          </p>
        </div>
        
        <div className="glass-morphism shadow-lg animate-fade-in p-1 rounded-lg">
          <LoginForm />
        </div>
        
        <p className="text-center text-xs text-muted-foreground animate-fade-in">
          A decentralized social network based on the NOSTR protocol
        </p>
      </div>
    </div>
  );
}
