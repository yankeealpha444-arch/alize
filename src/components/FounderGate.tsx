import { type ReactNode } from "react";
import { Navigate, Outlet } from "react-router-dom";

/**
 * Requires temporary founder session flag and renders child routes via `<Outlet />`.
 */
export default function FounderGate({ children }: { children?: ReactNode }) {
  const isAuthed = localStorage.getItem("alize_founder_session") === "true";
  console.log("FOUNDER SESSION", localStorage.getItem("alize_founder_session"));
  if (!isAuthed) {
    return <Navigate to="/login" replace />;
  }

  return <>{children ?? <Outlet />}</>;
}
