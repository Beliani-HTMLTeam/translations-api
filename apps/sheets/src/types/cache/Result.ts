export interface Result<T> {
  code?: number
  message?: string
  data?: T
  keys?: string[]
  error?: string
  details?: string
  dataOrigin?: 'cache' | 'googleAPI'
  executionTime?: number
}
