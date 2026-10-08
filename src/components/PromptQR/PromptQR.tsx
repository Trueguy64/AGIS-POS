import generatePayload from 'promptpay-qr';
import { QRCodeSVG } from 'qrcode.react';
import promptPayLogo from '../../assets/PromptQR/promptpay.png';
import { thb } from '../../lib/gold';

type PromptPayQRProps = {
  id: string;
  amount?: number;
  size?: number;
};

// Read the ink token from CSS so the QR foreground follows the design system (audit P3: hard-coded hex).
// Falls back to the previous hex if the document is unavailable (SSR) or the token is unset.
const inkFg = (() => {
  if (typeof document === 'undefined') return '#1F1A14';
  return getComputedStyle(document.documentElement).getPropertyValue('--color-ink').trim() || '#1F1A14';
})();

function PromptPayQR({ id, amount, size = 256 }: PromptPayQRProps) {
  // Prices are whole baht; the payload still accepts two decimals.
  const qrCodeValue = generatePayload(id, { amount: amount == null ? undefined : Math.round(amount * 100) / 100 });

  return (
    <div className='flex flex-col items-center gap-3'>
      <img src={promptPayLogo} alt='PromptPay' className='h-10' />
      <div className="rounded-slip border border-brass-300 p-3">
        <QRCodeSVG value={qrCodeValue} size={size} level="M" marginSize={1} fgColor={inkFg} />
      </div>
      {amount != null && <p className='text-display font-bold text-ink tabular-nums'>{thb(amount)}</p>}
    </div>
  );
}

export default PromptPayQR;
