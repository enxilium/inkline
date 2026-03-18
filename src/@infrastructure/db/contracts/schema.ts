import type { Tables, TablesInsert, TablesUpdate } from "./database.types";

export type CharacterDbRow = Tables<"characters">;
export type CharacterDbInsert = TablesInsert<"characters">;
export type CharacterDbUpdate = TablesUpdate<"characters">;

export type LocationDbRow = Tables<"locations">;
export type LocationDbInsert = TablesInsert<"locations">;
export type LocationDbUpdate = TablesUpdate<"locations">;

export type OrganizationDbRow = Tables<"organizations">;
export type OrganizationDbInsert = TablesInsert<"organizations">;
export type OrganizationDbUpdate = TablesUpdate<"organizations">;
