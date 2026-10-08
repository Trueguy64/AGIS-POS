import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginSchema, fieldErrors } from "../schemas/userSchemas";
import { useAuth } from "../contexts/AuthContext";
import { loginUser } from "../api/user";
import Field, { authInput } from "../components/Authentication/Field";
import Wordmark from "../components/Wordmark";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = loginSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setApiError("");
    setSubmitting(true);
    try {
      login(await loginUser(parsed.data));
      navigate("/");
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-4">
      <section className="w-full max-w-md rounded-slip border border-brass-300 bg-slip p-6 md:p-8" aria-labelledby="login-title">
        <Wordmark />
        <h1 id="login-title" className="mt-6 text-display font-bold text-ink">Sign in</h1>
        <p className="mt-1 text-ink-soft">Staff sign in with the email on their account.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Email" error={errors.email}>
            <input type="email" autoComplete="email" className={authInput} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoFocus />
          </Field>
          <Field label="Password" error={errors.password}>
            <input type="password" autoComplete="current-password" className={authInput} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </Field>

          {apiError && <p className="rounded-slip bg-stamp-tint px-3 py-2 text-stamp" role="alert">{apiError}</p>}

          <button type="submit" disabled={submitting} className="mt-2 h-12 rounded-slip bg-brass-700 font-bold text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-ink-soft">
          New here? <Link to="/register" className="font-semibold text-brass-800 hover:underline">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
