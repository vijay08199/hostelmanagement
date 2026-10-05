/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as allocations from "../allocations.js";
import type * as assignments from "../assignments.js";
import type * as attendance from "../attendance.js";
import type * as audit from "../audit.js";
import type * as auth from "../auth.js";
import type * as authorization from "../authorization.js";
import type * as complaints from "../complaints.js";
import type * as electricity from "../electricity.js";
import type * as fees from "../fees.js";
import type * as leaves from "../leaves.js";
import type * as maintenance from "../maintenance.js";
import type * as mess from "../mess.js";
import type * as notices from "../notices.js";
import type * as permissions from "../permissions.js";
import type * as requests from "../requests.js";
import type * as studentProfile from "../studentProfile.js";
import type * as transfer from "../transfer.js";
import type * as transferRequests from "../transferRequests.js";
import type * as users from "../users.js";
import type * as visitors from "../visitors.js";
import type * as warden from "../warden.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  allocations: typeof allocations;
  assignments: typeof assignments;
  attendance: typeof attendance;
  audit: typeof audit;
  auth: typeof auth;
  authorization: typeof authorization;
  complaints: typeof complaints;
  electricity: typeof electricity;
  fees: typeof fees;
  leaves: typeof leaves;
  maintenance: typeof maintenance;
  mess: typeof mess;
  notices: typeof notices;
  permissions: typeof permissions;
  requests: typeof requests;
  studentProfile: typeof studentProfile;
  transfer: typeof transfer;
  transferRequests: typeof transferRequests;
  users: typeof users;
  visitors: typeof visitors;
  warden: typeof warden;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
