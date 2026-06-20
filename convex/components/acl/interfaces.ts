import type { TableDefinition } from "convex/server";
import type { Infer } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type schema from "./schema";

type InferFromTable<T extends TableDefinition> =
  T extends TableDefinition<infer M> ? Infer<M> : unknown;

export interface ACLRole extends Doc<"roles"> {
  _id: Id<"roles">;
}

export interface ACLIdentity
  extends InferFromTable<typeof schema.tables.identities> {
  _id: Id<"identities">;
}
