export interface SystemPromptParts {
  stablePrefix: string
  volatileSuffix: string
}

export const PROFILE_ORDER = [
  'persona.md',
  'about.md',
  'skills.md',
  'experience.md',
  'projects.md',
  'education.md',
  'contact.md',
] as const

export async function buildSystemPrompt(
  fileLoaders?: Record<string, () => Promise<string>>
): Promise<SystemPromptParts> {
  const loaders = fileLoaders ?? import.meta.glob('../../data/profile/*.md', {
    query: '?raw',
    import: 'default',
  }) as Record<string, () => Promise<string>>

  const sections: string[] = []

  for (const filename of PROFILE_ORDER) {
    const filepath = `../../data/profile/${filename}`
    const loader = loaders[filepath]

    if (!loader) {
      console.warn(`Missing profile file: ${filename}`)
      continue
    }

    const content = await loader()
    const sectionName = filename.replace('.md', '').toUpperCase()
    sections.push(`--- ${sectionName} ---\n${content}`)
  }

  return {
    stablePrefix: sections.join('\n'),
    volatileSuffix: '',
  }
}