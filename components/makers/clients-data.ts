// PRD section 2 (Trusted by) and section 5.2 (Clients).
// A name or logo shows only with written permission ON FILE — set
// `permitted: true` the day it is, and delete the entry the day
// permission is withdrawn. No invented names, no placeholder logos
// (PRD: nothing that is not real on the day it is shown).
export type MakersClient = {
  name: string;
  sector: string;
  line: string; // one line on what the build team delivered
  // /images/makers/clients/<name>.svg|png — pair the mark with the name
  // per PRD; entries without a logo render as text only
  logo?: string;
};

export const CLIENTS: ReadonlyArray<MakersClient & { permitted: boolean }> = [
  { name: "Bloccpay", sector: "SaaS", line: "AI/ML", permitted: true },
  { name: "Wigxel", sector: "Design Agency", line: "AI/ML", permitted: true },
  { name: "CMK Culinary", sector: "Culinary", line: "AI/ML", permitted: true },
];

export const PERMITTED_CLIENTS = CLIENTS.filter((client) => client.permitted);
