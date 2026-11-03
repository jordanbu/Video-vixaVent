import type { AgentToolSchema } from '../../tool-schema';


export const INSTALL_SKILL_TOOL_SCHEMAS: AgentToolSchema[] = [
  {
    name: 'install_skill',
    description: 'Install a skill repository from GitHub into the local skills folder (~/.vixaventora/skills/<slug>/), including SKILL.md and its references/scripts/assets/examples. Once installed it shows up automatically in the Library "Skills" panel and can be activated with /skill:<slug> or from the panel. repo accepts a GitHub URL or owner/repo (e.g. "Jane-xiaoer/paper-collage-ad-codex"). slug is optional and defaults to the SKILL.md name or the repository name.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'GitHub repository: full URL (https://github.com/owner/repo) or owner/repo' },
        slug: { type: 'string', description: 'Optional: install folder name (must be kebab-case); defaults to the SKILL.md frontmatter name or the repository name' },
      },
      required: ['repo'],
    },
  },
];

export const INSTALL_SKILL_TOOL_NAMES = new Set(INSTALL_SKILL_TOOL_SCHEMAS.map((t) => t.name));
