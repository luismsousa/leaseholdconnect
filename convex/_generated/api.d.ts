/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as associations from "../associations.js";
import type * as audit from "../audit.js";
import type * as auditHelpers from "../auditHelpers.js";
import type * as clerkAuth from "../clerkAuth.js";
import type * as clerkHelpers from "../clerkHelpers.js";
import type * as documents from "../documents.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as meetings from "../meetings.js";
import type * as members from "../members.js";
import type * as migrateCleanupDuplicateUsers from "../migrateCleanupDuplicateUsers.js";
import type * as paasAdmin from "../paasAdmin.js";
import type * as router from "../router.js";
import type * as setupPaasAdmin from "../setupPaasAdmin.js";
import type * as stripe from "../stripe.js";
import type * as units from "../units.js";
import type * as userPreferences from "../userPreferences.js";
import type * as userProfile from "../userProfile.js";
import type * as voting from "../voting.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  associations: typeof associations;
  audit: typeof audit;
  auditHelpers: typeof auditHelpers;
  clerkAuth: typeof clerkAuth;
  clerkHelpers: typeof clerkHelpers;
  documents: typeof documents;
  emails: typeof emails;
  http: typeof http;
  leads: typeof leads;
  meetings: typeof meetings;
  members: typeof members;
  migrateCleanupDuplicateUsers: typeof migrateCleanupDuplicateUsers;
  paasAdmin: typeof paasAdmin;
  router: typeof router;
  setupPaasAdmin: typeof setupPaasAdmin;
  stripe: typeof stripe;
  units: typeof units;
  userPreferences: typeof userPreferences;
  userProfile: typeof userProfile;
  voting: typeof voting;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
