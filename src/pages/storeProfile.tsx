import { LogOut, RotateCcw, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { updateUser, logoutUser } from "../api/user";
import { updateSchema, fieldErrors, type UpdateFormData } from "../schemas/userSchemas";
import Field, { authInput } from "../components/Authentication/Field";

function StoreProfile() {
    const { user, updateUser: updateUserContext, logout } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState<UpdateFormData>({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
    const [errors, setErrors] = useState<Record<string, string | undefined>>({});
    const [apiError, setApiError] = useState("");
    const [saved, setSaved] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const set = (key: keyof UpdateFormData) => (e: React.ChangeEvent<HTMLInputElement>) => {
        setSaved(false);
        setForm({ ...form, [key]: e.target.value });
    };

    async function handleLogout() {
        try {
            await logoutUser();
        } finally {
            localStorage.removeItem('cart');
            logout();
            navigate("/login");
        }
    }

    function handleReset() {
        setForm({ name: user?.name ?? "", email: user?.email ?? "", phone: user?.phone ?? "" });
        setErrors({});
        setApiError("");
        setSaved(false);
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user?.id || submitting) return;
        const parsed = updateSchema.safeParse(form);
        if (!parsed.success) return setErrors(fieldErrors(parsed.error));
        setErrors({});
        setApiError("");
        setSubmitting(true);
        try {
            await updateUser(user.id, parsed.data);
            updateUserContext(parsed.data);
            setSaved(true);
        } catch (err) {
            setApiError(err instanceof Error ? err.message : "Something went wrong");
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-paper p-4 md:p-6 lg:p-8">
            <section className="mx-auto flex w-full max-w-xl flex-col rounded-slip border border-brass-300 bg-slip p-6 md:p-8" aria-labelledby="settings-title">
                <header className="flex items-center gap-3">
                    <button type="button" onClick={() => navigate("/")} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-slip border border-brass-300 text-ink hover:bg-paper" aria-label="Back to the counter">
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1 id="settings-title" className="text-display font-bold text-ink">Your account</h1>
                        <p className="text-ink-soft">{user?.role ?? "Staff"} · the phone number here is the PromptPay account customers pay into.</p>
                    </div>
                </header>

                <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
                    <Field label="Name" error={errors.name}>
                        <input className={authInput} autoComplete="name" value={form.name} onChange={set("name")} />
                    </Field>
                    <Field label="Email" error={errors.email}>
                        <input className={authInput} type="email" autoComplete="email" value={form.email} onChange={set("email")} required />
                    </Field>
                    <Field label="Phone" hint="PromptPay" error={errors.phone}>
                        <input className={`${authInput} tabular-nums`} type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set("phone")} />
                    </Field>

                    {apiError && <p className="rounded-slip bg-stamp-tint px-3 py-2 text-stamp" role="alert">{apiError}</p>}
                    {saved && !apiError && <p className="font-semibold text-ok" role="status">Saved.</p>}

                    <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
                        <button type="button" onClick={handleReset} className="flex h-12 items-center justify-center gap-2 rounded-slip border border-brass-300 px-4 font-semibold text-ink hover:bg-paper">
                            <RotateCcw size={18} /> Reset
                        </button>
                        <button type="submit" disabled={submitting} className="h-12 w-full rounded-slip bg-brass-700 font-bold text-slip hover:bg-brass-800 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-1">
                            {submitting ? "Saving…" : "Save changes"}
                        </button>
                    </div>
                </form>

                <div className="mt-10">
                    <button type="button" onClick={handleLogout} className="flex h-12 items-center justify-center gap-2 rounded-slip border border-stamp px-4 font-semibold text-stamp hover:bg-stamp-tint">
                        <LogOut size={18} /> Sign out
                    </button>
                </div>
            </section>
        </main>
    );
}

export default StoreProfile;
