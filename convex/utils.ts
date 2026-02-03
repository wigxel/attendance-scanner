import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import { internalMutation, internalQuery } from "./_generated/server"; // Added internalMutation

export const findDuplicates = internalQuery({
  args: {
    table: v.union(v.literal("profile"), v.literal("users")),
  },
  handler: async (ctx, args) => {
    // This function identifies emails that are duplicated within a single specified table.
    const records = await ctx.db.query(args.table).collect();
    const unique = new Set<string>(); // Explicitly type the Set
    const duplicates: string[] = []; // Explicitly type the array

    for (const record of records) {
      // Type assertion to ensure 'email' property is recognized and handled safely.
      const recordWithEmail = record as { email?: string };
      if (!recordWithEmail?.email) continue;

      if (unique.has(recordWithEmail.email)) {
        duplicates.push(recordWithEmail.email);
      } else {
        unique.add(recordWithEmail.email);
      }
    }

    return duplicates;
  },
});

// New function to fix duplicates as per the prompt.
export const fixDuplicates = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()), // Add dryRun argument, defaulting to false
  },
  handler: async (ctx, args) => {
    const { dryRun = true } = args; // Destructure dryRun with a default

    let deletedRecordIds: string[] = [];
    const logPrefix = dryRun ? "[DRY RUN] " : "";

    console.log(`${logPrefix}Starting fixDuplicates operation...`);

    // 1. Use the existing `findDuplicates` query to get a list of emails
    //    that are duplicated within the 'profile' table. The prompt implies
    //    that 'profile' records are the primary target for deletion.
    const duplicatedEmailsInProfile = await ctx.runQuery(
      internal.utils.findDuplicates,
      { table: "profile" },
    );

    // If no duplicate emails are found in the 'profile' table, there's nothing to fix.
    if (duplicatedEmailsInProfile.length === 0) {
      console.log(
        `${logPrefix}No duplicate emails found in the 'profile' table to fix.`,
      );
      return {
        deletedCount: 0,
        deletedIds: [],
        message: `${logPrefix}No duplicate emails found in the 'profile' table to fix.`,
      };
    }

    console.log(
      `${logPrefix}Found ${duplicatedEmailsInProfile.length} email(s) with duplicates in 'profile' table.`,
    );
    console.log(
      `${logPrefix}Duplicated emails: ${duplicatedEmailsInProfile.join(", ")}`,
    );

    // 2. Retrieve all emails from the 'users' table.
    //    This set will be used to check if a profile's email has a corresponding user.
    const userRecords = await ctx.db.query("users").collect();
    // Extract emails, filter out any undefined/null values, and cast to string[].
    const userEmails = new Set(
      userRecords
        .map((user) => (user as { email?: string }).email)
        .filter(Boolean) as string[],
    );
    console.log(
      `${logPrefix}Found ${userEmails.size} unique emails in the 'users' table.`,
    );

    // 3. Iterate through each email identified as duplicated in the 'profile' table.
    for (const email of duplicatedEmailsInProfile) {
      // Find all 'profile' records that share this specific duplicated email.
      const newly_deleted_emails = await ctx.runMutation(internal.utils.deleteDuplicateAccount, {
        dryRun,
        identifier: email,
        logPrefix,
      });

      deletedRecordIds = [
        ...deletedRecordIds,
        ...newly_deleted_emails
      ]
    }

    const message = `${logPrefix}Successfully ${dryRun ? "identified" : "fixed"} duplicates in 'profile' table. ${dryRun ? "Would delete" : "Deleted"} ${deletedRecordIds.length} records.`;
    console.log(message);

    return {
      deletedCount: deletedRecordIds.length,
      deletedIds: deletedRecordIds,
      message: message,
    };
  },
});

export const deleteDuplicateAccount = internalMutation({
  args: {
    dryRun: v.boolean(),
    identifier: v.string(),
    logPrefix: v.optional(v.string())
  },
  async handler(ctx, args) {
    const { dryRun = true, identifier: email, logPrefix = "" } = args;

    const deletedRecordIds = [];

    const profilesWithThisEmail = await ctx.db
      .query("profile")
      .filter((q) => q.eq(q.field("email"), email))
      .collect();

    const entries = await Promise.all(
      profilesWithThisEmail.map(async (p) => {
        console.log('id', p.id)
        return [p, await ctx.db.get(p.id as Id<"users">).catch(() => null)] as const;
      }),
    );

    const userRelationship = new Map(entries);

    // Proceed only if there are indeed multiple profile records for this email,
    // which `findDuplicates` should have already ensured.
    if (profilesWithThisEmail.length > 1) {
      console.log(
        `${logPrefix}Processing duplicate email: '${email}'. Found ${profilesWithThisEmail.length} profile records.`,
      );
      // The core logic from the prompt: "delete the one that doesn't have a record in the `users` table".
      // In the context of multiple profile records sharing the same email:
      // - If there's a corresponding `users` record for this email, we generally keep one `profile` record
      //   as the primary one and delete the rest. The deleted ones are considered duplicates that
      //   do not have a *unique* or intended corresponding `users` record.
      // - If there's NO corresponding `users` record for this email, and yet multiple profiles exist,
      //   all these profiles technically "don't have a record in the `users` table". To fix the
      //   internal duplication, we still consolidate them by keeping one and deleting the others.

      // Sort profiles to ensure consistent "keeping" (e.g., by creation time or ID)
      // For simplicity, we'll just slice after the first one as in the original code.
      // If there is a need to prioritize which profile to keep based on user record existence,
      // that logic would need to be added here.
      // Current logic: keep the first profile found by the query, delete subsequent ones.
      const pass_index: number = profilesWithThisEmail.findIndex((p) => {
        const user = userRelationship.get(p);

        // @ts-expect-error
        if ([null, undefined].includes(user)) {
          return false
        }

        return true;
      })

      const profileToPreserve = profilesWithThisEmail[pass_index];
      const profilesToDelete = profilesWithThisEmail.filter((_, index) => index !== pass_index) // Keep the first one, delete the rest

      for (const profileToDelete of profilesToDelete) {
        deletedRecordIds.push(profileToDelete._id.toString());

        if (dryRun) {
          console.log(
            `${logPrefix}Would delete duplicate profile record with ID: ${profileToDelete._id} and email: '${email}'`,
          );
        } else {
          // Delete the duplicate profile record from the database.
          await ctx.runMutation(internal.utils.updateProfileReferences, {
            new_id: profileToPreserve._id,
            old_id: profileToDelete._id,
          });

          await ctx.db.delete(profileToDelete._id);

          console.log(
            `Deleted duplicate profile record with ID: ${profileToDelete._id} and email: '${email}'`,
          );
        }
      }
    }

    return deletedRecordIds;
  }
})

export const updateProfileReferences = internalMutation({
  args: {
    old_id: v.string(),
    new_id: v.string(),
    dryRun: v.optional(v.boolean())
  },
  async handler(ctx, args) {
    const { old_id, new_id, dryRun: isDryRun = true } = args;

    const profile = await ctx.db.query('profile').filter(q => {
      return q.eq(q.field('_id'), new_id);
    }).first();

    if (!profile) {
      throw new Error(`Profile with ID (${new_id}) not found...`);
    }

    const maps =
      new Map([
        ['daily_register', [{ search_index: "admitted_by", column: 'admitted_by' }, { search_index: 'user', column: 'userId' }]],
        ['featureRequest', [{ search_index: 'user_id', column: 'userId' }]],
        ['featureVotes', [{ search_index: "user_id", column: "userId" }]]
      ] as const)

    async function update<T extends TableNames>(table: T, column_meta: { c: keyof Doc<T>, index: any }) {
      // @ts-expect-error
      const { column, search_index: index } = column_meta;

      const matches = await ctx.db.query(table)
        .withIndex(index, (q) => q.eq(column, old_id as Doc<T>[typeof column]))
        .collect();

      const lazy_process = matches.map(match => {
        return () => {
          console.info(`Updating ${table}:${column.toString()} record with ID: ${match._id}: ${old_id} to ${new_id} `);

          if (isDryRun) {
            return Promise.resolve();
          }

          // @ts-expect-error Novalock
          return ctx.db.patch(match._id, { [column.toString()]: new_id });
        }
      });

      return lazy_process;
    }

    const ops = await Promise.all(
      Array.from(maps.keys()).map((table) => {
        const columns = maps.get(table) ?? [];
        // @ts-expect-error
        return columns.map((f) => update(table, f))
      })
    );

    (await Promise.all(ops.flat()))
      .flat()
      .map(fn => fn())
  }
})

export const findUnassigned = internalQuery({
  args: {}, // No specific arguments needed as the target tables are fixed by the prompt
  handler: async (ctx) => {
    const tables = new Map([
      ["daily_register", 'userId'],
      ["featureVotes", 'userId'],
      ["featureRequest", 'userId'],
    ] as const)

    const records = {};

    for (const [table, user_column] of tables.entries()) {
      // 1. Get all `userId`s from the `daily_register` table.
      const dailyRegisterRecords = await ctx.db.query(table).collect();
      const dailyRegisterUserIds = new Set(
        dailyRegisterRecords.map((record) => record.userId),
      );

      // 2. Get all `_id`s from the `users` table.
      const userRecords = await ctx.db.query("users").collect();
      const existingUserIds = new Set(
        userRecords.map((user) => user._id.toString()), // Convert Id<"users"> to string for consistent comparison
      );

      // 3. Find `daily_register.userId` values that do not exist in the `users` table.
      const unassignedUserIds: string[] = [];
      for (const userId of dailyRegisterUserIds) {
        if (!existingUserIds.has(userId)) {
          unassignedUserIds.push(userId);
        }
      }

      // @ts-expect-error Not a problem
      records[table] = unassignedUserIds
    }

    return records;
  },
});



// Finds the empty emails and tries to match profiles
export const fixEmptyEmail = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()), // Add dryRun argument, defaulting to false
  },
  handler: async (ctx, args) => {
    const { dryRun = true } = args; // Destructure dryRun with a default

    const all = await ctx.db.query('profile').filter(q => q.eq(q.field('email'), undefined)).collect();

    for (const entry of all.slice(1)) {
      const match = await ctx.db.query('profile').filter(
        q => q.and(
          q.eq(q.field('firstName'), entry.firstName),
          q.eq(q.field('lastName'), entry.lastName),
          q.neq(q.field('email'), undefined)
        )
      ).first();

      if (match === null) {
        continue
      }

      if (match && entry && match?.id === entry.id) {
        continue;
      }

      if (match?.email) {
        if (dryRun) {
          console.log(`Dry run: Would update ${entry.id} with email ${match?.email}`);
        } else {
          await ctx.db.patch(entry._id, { email: match?.email });
        }
      } else {
        console.log("Invalid Match", match);
      }
    }

    return all.map(e => [e._id, e?.id ?? "none", e.email ?? "none"])
  },
});
