import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerSchema, fieldErrors } from "../schemas/userSchemas";
import { registerUser } from "../api/user";
import Field, { authInput } from "../components/Authentication/Field";
import Wordmark from "../components/Wordmark";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "", role: "" });
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const [apiError, setApiError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = registerSchema.safeParse(form);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setApiError("");
    setSubmitting(true);
    try {
      await registerUser(parsed.data);
      navigate("/login");
    } catch (err) {
      setApiError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-4 py-8">
      <section className="w-full max-w-md rounded-slip border border-brass-300 bg-slip p-6 md:p-8" aria-labelledby="register-title">
        <Wordmark />
        <h1 id="register-title" className="mt-6 text-display font-bold text-ink">Create an account</h1>
        <p className="mt-1 text-ink-soft">Managers edit the catalog; employees sell at the counter.</p>

        <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
          <Field label="Name" error={errors.name}>
            <input type="text" autoComplete="name" className={authInput} value={form.name} onChange={set("name")} autoFocus />
          </Field>
          <Field label="Phone" hint="your PromptPay number" error={errors.phone}>
            <input type="tel" autoComplete="tel" inputMode="tel" placeholder="088 934 4353" className={`${authInput} tabular-nums`} value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label="Email" error={errors.email}>
            <input type="email" autoComplete="email" className={authInput} value={form.email} onChange={set("email")} />
          </Field>
          <Field label="Password" hint="at least 8 characters" error={errors.password}>
            <input type="password" autoComplete="new-password" className={authInput} value={form.password} onChange={set("password")} />
          </Field>
          <Field label="Role" error={errors.role}>
            <select className={authInput} value={form.role} onChange={set("role")}>
              <option value="">Choose a role</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
            </select>
          </Field>

          {apiError && <p className="rounded-slip bg-stamp-tint px-3 py-2 text-stamp" role="alert">{apiError}</p>}

          <button type="submit" disabled={submitting} className="mt-2 h-12 rounded-slip bg-brass-700 font-bold text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50">
            {submitting ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-ink-soft">
          Already have one? <Link to="/login" className="font-semibold text-brass-800 hover:underline">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
