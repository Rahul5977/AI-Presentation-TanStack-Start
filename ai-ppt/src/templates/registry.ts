import { boldGradientTemplate } from '@/templates/definitions/bold-gradient'
import { corporateBlueTemplate } from '@/templates/definitions/corporate-blue'
import { editorialSerifTemplate } from '@/templates/definitions/editorial-serif'
import { midnightProTemplate } from '@/templates/definitions/midnight-pro'
import { minimalMonoTemplate } from '@/templates/definitions/minimal-mono'
import { techDarkTemplate } from '@/templates/definitions/tech-dark'
import { vibrantPopTemplate } from '@/templates/definitions/vibrant-pop'
import { warmSandTemplate } from '@/templates/definitions/warm-sand'
import { TEMPLATE_KINDS } from '@/templates/schema'
import type { TemplateConfig, TemplateKind } from '@/templates/schema'

const templates: Record<TemplateKind, TemplateConfig> = {
  MINIMAL_MONO: minimalMonoTemplate,
  BOLD_GRADIENT: boldGradientTemplate,
  EDITORIAL_SERIF: editorialSerifTemplate,
  TECH_DARK: techDarkTemplate,
  CORPORATE_BLUE: corporateBlueTemplate,
  VIBRANT_POP: vibrantPopTemplate,
  WARM_SAND: warmSandTemplate,
  MIDNIGHT_PRO: midnightProTemplate,
}

export function listTemplates() {
  return TEMPLATE_KINDS.map((kind) => templates[kind])
}

export function getTemplateByKind(kind: TemplateKind) {
  return templates[kind]
}

export function getDefaultTemplate() {
  return templates.MINIMAL_MONO
}

export const templateRegistry = templates
