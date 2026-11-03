import type { AgentToolSchema } from '../../tool-schema';

export const RUN_SKILL_SCRIPT_TOOL_NAMES = new Set(['run_skill_script']);

export const RUN_SKILL_SCRIPT_TOOL_SCHEMAS: AgentToolSchema[] = [
  {
    name: 'run_skill_script',
    description: 'Run a script inside an installed skill folder on this machine (allowlisted commands: bash/sh/node/npm/npx/python3/python/uv/uvx/ffmpeg/ffprobe/mkdir/cp/chmod); the working directory is locked to the skill folder. Use it to run the deterministic scripts a skill ships with (e.g. render.mjs, check-deps.sh); the cloud sandbox cannot access local skill files. Timeout defaults to 60s, max 120s; output is capped at 512KB.',
    input_schema: {
      type: 'object',
      properties: {
        skill: { type: 'string', description: 'Skill slug (the skill field returned by load_skill)' },
        command: { type: 'string', description: 'Command (the first word must be an allowlisted executable), e.g. bash scripts/check-deps.sh or node scripts/render.mjs' },
        timeout: { type: 'number', description: 'Optional: timeout in milliseconds, default 60000, max 120000' },
      },
      required: ['skill', 'command'],
    },
  },
];
