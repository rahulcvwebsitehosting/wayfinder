import { describe, expect, it } from 'bun:test'
import {
  visibleProviderTemplates,
  visibleProviderTypeOptions,
} from './provider-visibility'
import { providerTemplates, providerTypeOptions } from './providerTemplates'

describe('provider visibility', () => {
  it('returns all providers when no filtering applies', () => {
    const templates = visibleProviderTemplates(
      providerTemplates,
      () => true,
    )
    const options = visibleProviderTypeOptions(
      providerTypeOptions,
      () => true,
    )

    expect(templates.length).toBe(providerTemplates.length)
    expect(options.length).toBe(providerTypeOptions.length)
    expect(templates.map((template) => template.id)).toContain('openai')
  })
})
