import type { SaleLine } from "../../../types/types";
import PrintableItems from "./PrintableItems";
import { S } from "../../../lib/i18n";

interface Props {
    lines: SaleLine[];
}

const head = (k: keyof typeof S) => <>{S[k][0]}<span className="block font-normal text-ink-muted">{S[k][1]}</span></>;

export default function PrintableColumn({ lines }: Props) {
    return (
        <>
            <thead>
                <tr className="border-b border-ink text-left align-bottom text-ink-soft">
                    <th className="w-8 py-2 font-semibold">#</th>
                    <th className="py-2 font-semibold">{head("item")}</th>
                    <th className="w-24 py-2 text-right font-semibold">{head("unitPrice")}</th>
                    <th className="w-16 py-2 pl-2 text-right font-semibold">{head("qty")}</th>
                    <th className="w-32 py-2 text-right font-semibold">{head("amount")}</th>
                </tr>
            </thead>
            <tbody>
                {lines.map((line, index) => (
                    <PrintableItems key={line.id} line={line} index={index} />
                ))}
            </tbody>
        </>
    );
}
