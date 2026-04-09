import { Plus, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar";

interface ChatSidebarProps {
  onNewChat: () => void;
}

export function ChatSidebar({ onNewChat }: ChatSidebarProps) {
  return (
    <Sidebar className="border-r border-border">
      <SidebarHeader className="border-b border-border p-4">
        {/* Logo container - replace with custom image when uploaded */}
        <span className="text-lg font-normal tracking-[0.08em] text-foreground" style={{ fontFamily: 'Georgia, "Times New Roman", Times, serif' }}>alize</span>
        <Button
          onClick={onNewChat}
          variant="outline"
          className="mt-4 w-full justify-start gap-2 border-border bg-transparent text-foreground hover:bg-accent"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton isActive className="gap-2">
                  <MessageCircle className="h-4 w-4" />
                  <span>Welcome</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
