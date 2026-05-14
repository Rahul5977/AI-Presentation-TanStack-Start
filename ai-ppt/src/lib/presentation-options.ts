import { listTemplates } from '@/templates/registry'
import { TEMPLATE_KINDS } from '@/templates/schema'

export const audienceOptions = [
  { value: 'STUDENTS', label: 'Students' },
  { value: 'PROFESSIONALS', label: 'Professionals' },
  { value: 'INVESTORS', label: 'Investors' },
  { value: 'GENERAL', label: 'General' },
  { value: 'CUSTOM', label: 'Custom' },
] as const

export const toneOptions = [
  { value: 'FORMAL', label: 'Formal' },
  { value: 'CASUAL', label: 'Casual' },
  { value: 'PERSUASIVE', label: 'Persuasive' },
  { value: 'EDUCATIONAL', label: 'Educational' },
  { value: 'INSPIRATIONAL', label: 'Inspirational' },
] as const

export const lengthOptions = [
  { value: 'SHORT', label: 'Short', hint: '5-7 slides' },
  { value: 'MEDIUM', label: 'Medium', hint: '8-12 slides' },
  { value: 'LONG', label: 'Long', hint: '13-20 slides' },
  { value: 'CUSTOM', label: 'Custom', hint: 'Set a number' },
] as const

export const languageOptions = [
  'English',
  'Hindi',
  'Spanish',
  'French',
  'German',
] as const

export const templateValues = TEMPLATE_KINDS

export const templateOptions = listTemplates().map((template) => ({
  value: template.metadata.id,
  label: template.metadata.name,
})) as ReadonlyArray<{
  value: (typeof templateValues)[number]
  label: string
}>

export const imageStyleOptions = [
  { value: 'REALISTIC', label: 'Realistic' },
  { value: 'ILLUSTRATION', label: 'Illustration' },
  { value: 'MINIMAL', label: 'Minimal' },
  { value: 'THREE_D', label: '3D' },
] as const

export const depthOptions = [
  { value: 'HIGH_LEVEL', label: 'High-level overview' },
  { value: 'BALANCED', label: 'Balanced' },
  { value: 'DETAILED', label: 'Detailed / research-heavy' },
] as const

export type AudienceValue = (typeof audienceOptions)[number]['value']
export type ToneValue = (typeof toneOptions)[number]['value']
export type LengthValue = (typeof lengthOptions)[number]['value']
export type LanguageValue = (typeof languageOptions)[number]
export type TemplateValue = (typeof templateValues)[number]
export type ImageStyleValue = (typeof imageStyleOptions)[number]['value']
export type DepthValue = (typeof depthOptions)[number]['value']
