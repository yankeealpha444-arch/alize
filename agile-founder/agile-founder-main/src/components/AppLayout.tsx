import { NavLink, Outlet, useParams, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, FlaskConical, Eye, GitBranch,
  Users, Share2, Wrench, PanelLeftClose, PanelLeft,
  Monitor, UserCircle, Home, ChevronRight
} from "lucide-react";
import { useState } from "react";

const AppLayout = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { projectId } = useParams<{ projectId: string }>();
  const pid = projectId || "default";
  const navigate = useNavigate();
  const location = useLocation();

  const idea = localStorage.getItem("alize_idea") || "My Startup";
  const projectName = idea.split(" ").slice(0, 4).join(" ");

  // Breadcrumb: figure out current page name
  const pathSegment = location.pathname.split("/")[1] || "dashboard";
  const pageLabels: Record<string, string> = {
    dashboard: "Dashboard",
    tests: "Tests & Results",
    preview: "Preview Changes",
    versions: "Versions",
    builder: "Edit MVP",
    publish: "Publish & Share",
    "get-users": "Get Users",
  };
  const currentPageLabel = pageLabels[pathSegment] || "Dashboard";

  const navSections = [
    {
      label: "Operate",
      items: [
        { to: `/dashboard/${pid}`, icon: LayoutDashboard, label: "Dashboard" },
        { to: `/tests/${pid}`, icon: FlaskConical, label: "Tests & Results" },
        { to: `/preview/${pid}`, icon: Eye, label: "Preview Changes" },
        { to: `/versions/${pid}`, icon: GitBranch, label: "Versions" },
      ],
    },
    {
      label: "Build",
      items: [
        { to: `/builder/${pid}`, icon: Wrench, label: "Edit MVP" },
      ],
    },
    {
      label: "Grow",
      items: [
        { to: `/publish/${pid}`, icon: Share2, label: "Publish & Share" },
        { to: `/get-users/${pid}`, icon: Users, label: "Get Users" },
      ],
    },
  ];

  const handleOpenUserView = () => {
    window.open(`/p/${pid}`, "_blank");
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className={`${collapsed ? "w-14" : "w-56"} shrink-0 bg-sidebar border-r border-sidebar-border flex flex-col transition-all duration-200`}>
        <div className={`p-4 border-b border-sidebar-border flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
          {!collapsed && (
            <button onClick={() => navigate("/")} className="min-w-0 text-left hover:opacity-80 transition-opacity">
              <h1 className="text-sm font-bold tracking-tight text-foreground truncate">
                <span className="text-primary">Alizé</span>
              </h1>
              <p className="text-[10px] text-muted-foreground truncate mt-0.5">{projectName}</p>
            </button>
          )}
          {collapsed && (
            <button onClick={() => navigate("/")} className="p-1 rounded hover:bg-sidebar-accent text-primary font-bold text-sm transition-colors" title="Home">
              A
            </button>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 rounded hover:bg-sidebar-accent text-muted-foreground hover:text-foreground transition-colors shrink-0">
            {collapsed ? <PanelLeft className="w-4 h-4" /> : <PanelLeftClose className="w-4 h-4" />}
          </button>
        </div>

        {/* Founder Mode indicator + User View button */}
        {!collapsed && (
          <div className="px-3 pt-3 pb-1 space-y-2">
            <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-primary/10 border border-primary/20">
              <UserCircle className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-bold text-primary uppercase tracking-wide">Founder Mode</span>
            </div>
            <button
              onClick={handleOpenUserView}
              className="w-full flex items-center justify-center gap-1.5 text-[10px] font-medium py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <Monitor className="w-3 h-3" />
              Switch to User View →
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto py-2 px-1.5 space-y-3">
          <NavLink
            to="/"
            className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors ${collapsed ? "justify-center" : ""}`}
            title={collapsed ? "All Projects" : undefined}
          >
            <Home className="w-3.5 h-3.5 shrink-0" />
            {!collapsed && <span>All Projects</span>}
          </NavLink>

          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-[9px] text-muted-foreground uppercase tracking-widest px-2.5 mb-1">{section.label}</p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors ${
                        isActive
                          ? "bg-sidebar-accent text-primary font-semibold"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      } ${collapsed ? "justify-center" : ""}`
                    }
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-3.5 h-3.5 shrink-0" />
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Persistent Edit MVP button at bottom */}
        {!collapsed && (
          <div className="p-3 border-t border-sidebar-border space-y-2">
            <button
              onClick={() => navigate(`/builder/${pid}`)}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-semibold py-2.5 rounded-lg bg-foreground text-background hover:opacity-90 transition-opacity"
            >
              <Wrench className="w-3.5 h-3.5" />
              Edit MVP
            </button>
            <div className="text-[10px] text-muted-foreground text-center">Founder Mode · {projectName}</div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Breadcrumb bar */}
        <div className="px-6 py-2.5 border-b border-border bg-card/50 flex items-center gap-1.5 text-xs text-muted-foreground">
          <button onClick={() => navigate("/")} className="hover:text-foreground transition-colors">Alizé</button>
          <ChevronRight className="w-3 h-3" />
          <button onClick={() => navigate(`/dashboard/${pid}`)} className="hover:text-foreground transition-colors truncate max-w-[150px]">{projectName}</button>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{currentPageLabel}</span>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
