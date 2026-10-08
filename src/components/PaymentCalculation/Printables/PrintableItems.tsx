import type { SaleLine } from "../../../types/types";
import { describeGold, thb } from "../../../lib/gold";
import { th } from "../../../lib/i18n";

interface Props {
    line: SaleLine;
    index: number;
}

export default function PrintableItems({ line, index }: Props) {
    return (
        <tr className="align-top">
            <td className="py-2 text-ink-soft tabular-nums">{index + 1}</td>
            <td className="py-2">
                <span className="font-semibold">{line.title}</span>
                <span className="block text-ink-soft">{describeGold(line)}</span>
                <span className="block text-ink-muted">{th("laborFee")} {thb(line.laborFee)}</span>
            </td>
            <td className="py-2 text-right tabular-nums">{thb(line.unitPrice)}</td>
            <td className="py-2 text-right tabular-nums">{line.quantity}</td>
            <td className="py-2 text-right tabular-nums">{thb(line.unitPrice * line.quantity)}</td>
        </tr>
    );
}
