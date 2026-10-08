import { Navigate, useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import type { Role } from "../../types/types";
import Wordmark from "../Wordmark";

interface ProtectedRouteProps {
  children: ReactNode;
  role?: Role;
}

function AccessDenied({ role, current }: { role: Role; current: Role }) {
  const navigate = useNavigate();
  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-4">
      <section className="w-full max-w-md rounded-slip border border-brass-300 bg-slip p-6 md:p-8" aria-labelledby="denied-title">
        <Wordmark />
        <h1 id="denied-title" className="mt-6 text-display font-bold text-ink">Managers only</h1>
        <p className="mt-2 text-ink-soft">
          This page needs the <span className="font-semibold text-ink">{role}</span> role. You are signed in as <span className="font-semibold text-ink">{current}</span>.
        </p>
        <button type="button" onClick={() => navigate("/")} className="mt-6 flex h-12 items-center justify-center gap-2 rounded-slip bg-brass-700 px-5 font-bold text-slip hover:bg-brass-800">
          <ArrowLeft size={18} /> Back to the counter
        </button>
      </section>
    </main>
  );
}

export default function ProtectedRoute({ children, role }: ProtectedRouteProps) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <AccessDenied role={role} current={user.role} />;
  return <>{children}</>;
}
