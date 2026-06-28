import { templateValues } from '@/lib/presentation-options'
import { templateRegistry } from '@/templates/registry'
import type { TemplateKind } from '@/templates/schema'

type AssertTemplateKindCoverage = {
  [K in TemplateKind]: K
}

const _templateValuesCoverageCheck: AssertTemplateKindCoverage = {
  MINIMAL_MONO: templateValues[0],
  BOLD_GRADIENT: templateValues[1],
  EDITORIAL_SERIF: templateValues[2],
  TECH_DARK: templateValues[3],
  CORPORATE_BLUE: templateValues[4],
  VIBRANT_POP: templateValues[5],
  WARM_SAND: templateValues[6],
  MIDNIGHT_PRO: templateValues[7],
}

export const templateKindCoverage = _templateValuesCoverageCheck
export const templateRegistryCoverageCheck: Record<TemplateKind, unknown> =
  templateRegistry
