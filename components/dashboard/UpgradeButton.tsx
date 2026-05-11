'use client';

import { useState } from 'react';
import PaymentMethodModal from '@/components/PaymentMethodModal';

interface Props {
  planKey?: string;
  planName?: string;
  planPrice?: string;
  label?: string;
  className?: string;
}

export default function UpgradeButton({
  planKey = 'pro',
  planName = 'Pro',
  planPrice = '$25',
  label = 'Upgrade now →',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        {label}
      </button>
      <PaymentMethodModal
        isOpen={open}
        onClose={() => setOpen(false)}
        planKey={planKey}
        planName={planName}
        planPrice={planPrice}
      />
    </>
  );
}
