import { redirect } from "next/navigation";

// Placeholder group links for makers and lounge: the user swaps in the final
// URLs before this ships. Keep this map the single source of volatile links.
const channels: Record<string, string> = {
  whatsapp: "https://wa.me/+2348136943896",
  email: "mailto:business@inspace.ng",
  makers: "https://chat.whatsapp.com/ESEEtcMAKkX2vxaVU8UTkG?mode=gi_t",
  lounge: "https://wa.me/+2348136943896",
  instagram: "https://instagram.com/inspaceHQ",
};

export default async function Shortlinks({
  params,
}: {
  params: Promise<{ channel: string }>;
}) {
  const contact_channel = (await params).channel;
  const target = channels[contact_channel];

  if (target) return redirect(target);

  return "tel:+2348136943896";
}
