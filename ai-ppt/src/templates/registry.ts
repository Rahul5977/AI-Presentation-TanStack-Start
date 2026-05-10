import { boldGradientTemplate } from '@/templates/definitions/bold-gradient'
import { editorialSerifTemplate } from '@/templates/definitions/editorial-serif'
import { minimalMonoTemplate } from '@/templates/definitions/minimal-mono'
import { techDarkTemplate } from '@/templates/definitions/tech-dark'
import { TEMPLATE_KINDS } from '@/templates/schema'
import type { TemplateConfig, TemplateKind } from '@/templates/schema'

const templates: Record<TemplateKind, TemplateConfig> = {
  MINIMAL_MONO: minimalMonoTemplate,
  BOLD_GRADIENT: boldGradientTemplate,
  EDITORIAL_SERIF: editorialSerifTemplate,
  TECH_DARK: techDarkTemplate,
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
