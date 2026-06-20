import type { User } from "@clerk/nextjs/server";

export const ConvexUserImpl = {
  role(user: User): string {
    return String(user?.privateMetadata?.role);
  },
};
