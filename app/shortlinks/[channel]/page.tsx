import { redirect } from "next/navigation";


export default async function Shortlinks({ params }: { params: Promise<{ channel: string }> }) {
  const contact_channel = (await params).channel;

  if (contact_channel === 'whatsapp') {
    return redirect('https://wa.me/+2347012007448');
  }

  if (contact_channel === 'email')
    return redirect('mailto:business@inspace.ng');

  return 'tel:+2347012007448'
}
