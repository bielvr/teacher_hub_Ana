import { redirect } from 'next/navigation';

export default async function FinancialRedirectPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const resolved = await searchParams;
  const orgParam = resolved.org ? `?org=${resolved.org}` : '';
  redirect(`/professor/billing${orgParam}`);
}
