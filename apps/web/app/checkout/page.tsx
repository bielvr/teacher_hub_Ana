import { createClient } from '../../src/lib/supabase/server';
import { CheckoutClient } from '../../src/components/checkout/CheckoutClient';

interface PageProps {
  searchParams: Promise<{
    plan?: string;
    cycle?: 'monthly' | 'yearly';
    coupon?: string;
  }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profileName = '';
  let profileEmail = user?.email || '';

  if (user?.id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.full_name) profileName = profile.full_name;
    if (profile?.email) profileEmail = profile.email;
  }

  return (
    <div className="min-h-screen bg-[#F7F4ED] text-[#2B2426]">
      <CheckoutClient
        initialPlanSlug={resolvedParams.plan || 'fikra-pro'}
        initialCycle={resolvedParams.cycle === 'yearly' ? 'yearly' : 'monthly'}
        initialCoupon={resolvedParams.coupon || ''}
        currentUserId={user?.id}
        currentUserEmail={profileEmail}
        currentUserName={profileName}
      />
    </div>
  );
}
