import { describe, it, expect, vi } from 'vitest'
import { buildSystemPrompt, PROFILE_ORDER } from './system-prompt'

function createMockLoaders(overrides?: Record<string, string>): Record<string, () => Promise<string>> {
  const defaults: Record<string, string> = {
    '../../data/profile/persona.md': 'Persona content',
    '../../data/profile/about.md': 'About content',
    '../../data/profile/skills.md': 'Skills content',
    '../../data/profile/experience.md': 'Experience content',
    '../../data/profile/projects.md': 'Projects content',
    '../../data/profile/education.md': 'Education content',
    '../../data/profile/contact.md': 'Contact content',
  }
  const merged = { ...defaults, ...overrides }
  return Object.fromEntries(
    Object.entries(merged).map(([path, content]) => [path, () => Promise.resolve(content)])
  )
}

describe('buildSystemPrompt', () => {
  it('returns string with all 7 section delimiters', async () => {
    const loaders = createMockLoaders()
    const result = await buildSystemPrompt(loaders)

    expect(result.stablePrefix).toContain('--- PERSONA ---')
    expect(result.stablePrefix).toContain('--- ABOUT ---')
    expect(result.stablePrefix).toContain('--- SKILLS ---')
    expect(result.stablePrefix).toContain('--- EXPERIENCE ---')
    expect(result.stablePrefix).toContain('--- PROJECTS ---')
    expect(result.stablePrefix).toContain('--- EDUCATION ---')
    expect(result.stablePrefix).toContain('--- CONTACT ---')
  })

  it('has persona section first in output', async () => {
    const loaders = createMockLoaders()
    const result = await buildSystemPrompt(loaders)

    const personaIndex = result.stablePrefix.indexOf('--- PERSONA ---')
    const aboutIndex = result.stablePrefix.indexOf('--- ABOUT ---')
    const skillsIndex = result.stablePrefix.indexOf('--- SKILLS ---')

    expect(personaIndex).toBeLessThan(aboutIndex)
    expect(personaIndex).toBeLessThan(skillsIndex)
  })

  it('has contact section last in output', async () => {
    const loaders = createMockLoaders()
    const result = await buildSystemPrompt(loaders)

    const contactIndex = result.stablePrefix.indexOf('--- CONTACT ---')
    const educationIndex = result.stablePrefix.indexOf('--- EDUCATION ---')
    const projectsIndex = result.stablePrefix.indexOf('--- PROJECTS ---')

    expect(contactIndex).toBeGreaterThan(educationIndex)
    expect(contactIndex).toBeGreaterThan(projectsIndex)
  })

  it('handles missing files gracefully with warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const loaders = createMockLoaders()
    delete loaders['../../data/profile/contact.md']

    const result = await buildSystemPrompt(loaders)

    expect(console.warn).toHaveBeenCalledWith('Missing profile file: contact.md')
    expect(result.stablePrefix).not.toContain('--- CONTACT ---')
    expect(result.stablePrefix).toContain('--- PERSONA ---')

    warnSpy.mockRestore()
  })

  it('returns empty volatileSuffix', async () => {
    const loaders = createMockLoaders()
    const result = await buildSystemPrompt(loaders)

    expect(result.volatileSuffix).toBe('')
  })

  it('has token count under 2000', async () => {
    const loaders = createMockLoaders()
    const result = await buildSystemPrompt(loaders)

    const tokenCount = Math.ceil(result.stablePrefix.length / 4)
    expect(tokenCount).toBeLessThan(2000)
  })

  it('wraps each section with delimiter', async () => {
    const loaders = createMockLoaders()
    const result = await buildSystemPrompt(loaders)

    const lines = result.stablePrefix.split('\n')
    expect(lines[0]).toBe('--- PERSONA ---')
    expect(lines[2]).toBe('--- ABOUT ---')
  })
})

describe('PROFILE_ORDER', () => {
  it('has correct order', () => {
    expect(PROFILE_ORDER).toEqual([
      'persona.md',
      'about.md',
      'skills.md',
      'experience.md',
      'projects.md',
      'education.md',
      'contact.md',
    ])
  })
})