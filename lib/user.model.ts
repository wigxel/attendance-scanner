import type { User } from "@clerk/nextjs/server";

export const ConvexUserImpl = {
  role(user: User): string | null {
    const role = user?.privateMetadata?.role;

    if (role) return role as string;

    return null;
  },
};
