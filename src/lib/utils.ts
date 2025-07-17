import { z } from 'zod'

/**
 * Schema for validating Dataverse entity metadata
 */
export const EntityMetadataSchema = z.object({
  logicalName: z.string(),
  displayName: z.string(),
  primaryIdAttribute: z.string(),
  primaryNameAttribute: z.string().optional(),
})

export type EntityMetadata = z.infer<typeof EntityMetadataSchema>

/**
 * Validates entity metadata against the schema
 */
export function validateEntityMetadata(metadata: unknown): EntityMetadata {
  return EntityMetadataSchema.parse(metadata)
}

/**
 * Formats a Dataverse entity logical name to display name
 */
export function formatEntityName(logicalName: string): string {
  return logicalName.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())
}
