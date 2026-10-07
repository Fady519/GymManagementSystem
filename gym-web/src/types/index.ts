import type { components } from "@/types/api";

/**
 * Friendly names for the types generated from docs/openapi.json (run `npm run gen:api` after the API changes).
 * Add a line here when a page needs a new type.
 */
type Schemas = components["schemas"];

export type PlanResponse = Schemas["PlanResponse"];
export type CategoryResponse = Schemas["CategoryResponse"];
export type SessionResponse = Schemas["SessionResponse"];
export type SessionResponsePagedResult = Schemas["SessionResponsePagedResult"];
