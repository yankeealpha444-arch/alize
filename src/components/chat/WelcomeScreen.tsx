import { ChatInput } from "./ChatInput";

interface WelcomeScreenProps {
  onSendMessage: (message: string) => void;
}

export function WelcomeScreen({ onSendMessage }: WelcomeScreenProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6">
      <div className="w-full max-w-2xl space-y-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl font-light tracking-tight text-foreground md:text-5xl">
            Welcome to Alizé
          </h1>
          <p className="text-lg text-muted-foreground">
            Think clearly. Build instantly. Execute fast.
          </p>
        </div>
        
        <div className="pt-4">
          <ChatInput
            onSendMessage={onSendMessage}
            placeholder="Describe what you want to build…"
          />
        </div>
      </div>
    </div>
  );
}
