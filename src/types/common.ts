/**
 * Common types for Dataverse operations
 */

export type EntityReference = {
  id: string
  logicalName: string
  name?: string
}

export type AttributeType =
  | 'string'
  | 'integer'
  | 'decimal'
  | 'boolean'
  | 'datetime'
  | 'lookup'
  | 'picklist'
  | 'memo'

export type DataverseResponse<T = unknown> = {
  value: T[]
  '@odata.context': string
  '@odata.count'?: number
  '@odata.nextLink'?: string
}

export type QueryOptions = {
  select?: string[]
  filter?: string
  orderBy?: string[]
  top?: number
  skip?: number
  expand?: string[]
}
