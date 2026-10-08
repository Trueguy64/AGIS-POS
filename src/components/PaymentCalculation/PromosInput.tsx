import type { PromoEnterData } from "../../schemas/promoSchemas";
import { promoEnterSchema } from "../../schemas/promoSchemas";
import { useState } from "react";
import { both, th } from "../../lib/i18n";

interface Props {
    onSubmit?: (data: PromoEnterData) => Promise<void>;
}

export default function PromosInput({ onSubmit }: Props) {
    const [code, setCode] = useState("");
    const [apiError, setApiError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setApiError("");
        try {
            await onSubmit?.(promoEnterSchema.parse({ code }));
            setCode("");
        } catch (err) {
            setApiError(err instanceof Error && err.message ? err.message : "Something went wrong");
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
            <div className="flex gap-2">
                <input
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    type="text"
                    placeholder={both("promoCode")}
                    aria-label={both("promoCode")}
                    autoComplete="off"
                    className="h-11 min-w-0 flex-1 rounded-slip border border-brass-300 bg-slip px-3 font-semibold uppercase text-ink placeholder:normal-case focus:border-brass-700 focus:outline-none"
                />
                <button type="submit" className="h-11 rounded-slip border border-brass-700 px-4 font-semibold text-brass-800 hover:bg-brass-100">{th("apply")}</button>
            </div>
            {apiError && <p className="rounded-slip bg-stamp-tint px-3 py-2 text-stamp" role="alert">{apiError}</p>}
        </form>
    );
}
