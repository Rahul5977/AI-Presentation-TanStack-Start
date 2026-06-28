/** AI orchestration runtime — single entry point for all model calls.
 *
 * Usage: build a fallback chain with `getFallbackChain(op)`, then call
 * `callModel({ op, kind, chain, run, userId, cacheInput })` where `run` invokes
 * the underlying provider SDK and returns `{ value, usage }`.
 */
export { callModel } from './call-model'
export type { CallModelOptions, CallModelResult, ModelRunResult } from './call-model'
export { getFallbackChain, textModel, imageModel } from './registry'
export type { AiOp, ProviderAttempt, TextProvider, ImageProvider } from './registry'
export {
  classifyError,
  TimeoutError,
  BudgetExceededError,
  AllProvidersFailedError,
  ModelOutputError,
} from './errors'
export type { ErrorClass, BudgetScope } from './errors'
export type { TokenUsage } from './pricing'
export { estimateCostUsd } from './pricing'
export { checkBudget, recordSpend, getDailySpend } from './budget'
export { aiConfig } from './config'
export type { CallKind } from './config'
