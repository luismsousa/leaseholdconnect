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
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as documents from "../documents.js";
import type * as http from "../http.js";
import type * as members from "../members.js";
import type * as router from "../router.js";
import type * as units from "../units.js";
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
  audit: typeof audit;
  auth: typeof auth;
  documents: typeof documents;
  http: typeof http;
  members: typeof members;
  router: typeof router;
  units: typeof units;
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
