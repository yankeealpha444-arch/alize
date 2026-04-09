import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function ChatInput({ 
  onSendMessage, 
  placeholder = "Type a message…",
  autoFocus = true 
}: ChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSubmit = () => {
    const trimmedMessage = message.trim();
    if (trimmedMessage) {
      onSendMessage(trimmedMessage);
      setMessage("");
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  const handleInput = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  return (
    <div className="relative w-full">
      <div className="relative flex items-end rounded-xl border border-border bg-secondary/50">
        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          placeholder={placeholder}
          className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3.5 pr-12 text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
          rows={1}
        />
        <Button
          onClick={handleSubmit}
          disabled={!message.trim()}
          size="icon"
          className="absolute bottom-2 right-2 h-8 w-8 rounded-lg bg-foreground text-background transition-opacity hover:bg-foreground/90 disabled:opacity-30"
        >
          <ArrowUp className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
