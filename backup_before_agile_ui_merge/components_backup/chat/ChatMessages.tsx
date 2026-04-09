import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

export interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
}

interface ChatMessagesProps {
  messages: Message[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
      <div className="mx-auto max-w-2xl space-y-6">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex w-full",
              message.role === "user" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                message.role === "user"
                  ? "bg-foreground text-background"
                  : "bg-secondary text-foreground"
              )}
            >
              {message.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
