import type { User } from "@clerk/nextjs/server";

export const ConvexUserImpl = {
  role(user: User) {
    return user?.privateMetadata?.role;
  },
};
