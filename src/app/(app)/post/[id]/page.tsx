import { redirect } from 'next/navigation';
import { idSchema } from '@/lib/validators';

export default function PostRedirectPage({ params }: { params: { id: string } }) {
  const parsed = idSchema.safeParse(params.id);
  if (!parsed.success) redirect('/feed');
  redirect(`/feed?report=${encodeURIComponent(parsed.data)}`);
}
