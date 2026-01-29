import { ofetch } from "ofetch";

const clerkFetch = ofetch.create({
  baseURL: "https://api.clerk.com/v1",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${process.env.CLERK_API_KEY}`,
  },
});

export async function updateMetadata(params: {
  clerkUserId: string;
  metadata: Record<string, unknown>;
}) {
  return clerkFetch(`/users/${params.clerkUserId}/metadata`, {
    method: "PATCH",
    body: params.metadata,
  });
}

export async function setExternalId(params: {
  clerkUserId: string;
  convexUserId: string;
}) {
  // set convex user id
  const payload = {
    external_id: params.convexUserId,
  };

  return clerkFetch(`https://api.clerk.com/v1/users/${params.clerkUserId}`, {
    method: "PATCH",
    body: payload,
  });
}

export async function deleteClerkUser(params: {
  clerkUserId: string
}) {
  return clerkFetch(`https://api.clerk.com/v1/users/${params.clerkUserId}`, {
    method: "DELETE"
  });
}

export async function updateClerkUser(params: {
  userId: string;
  firstName: string;
  lastName: string;
}) {
  const body = {
    "first_name": params.firstName,
    "last_name": params.lastName,
  }

  return clerkFetch(`https://api.clerk.com/v1/users/${params.userId}`, {
    method: "PATCH",
    body
  });
}
