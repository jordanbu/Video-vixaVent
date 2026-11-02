import type { AgentToolSchema } from '../../tool-schema';

export const EDIT_ASSET_TOOL_SCHEMAS: AgentToolSchema[] = [
  {
    name: 'edit_asset',
    description: [
      'Update or delete media-pool assets, not timeline clips; use move_item/remove_item for clips.',
      'action=update changes name, props, or exact sourceTimecode/captureClock metadata; code assets such as generated motion graphics may receive new code,',
      'which must pass sandbox compilation before any change is saved. New code also replaces the code of every clip of that asset already on the timeline',
      '(each clip keeps its own props, timing, transitions and effects; the result reports updatedClips), so do not delete and re-place clips to refresh them.',
      'Clock metadata uses normalized frameCount + rational frameRate + dropFrame.',
    ].join(' '),
    input_schema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['update', 'delete'] },
        assetId: { type: 'string', description: 'Target asset id or unique prefix.' },
        name: { type: 'string', description: 'update: new display name.' },
        code: { type: 'string', description: 'update: new source for a code asset such as motion graphics; sandbox-validated; also applied to its placed clips.' },
        props: { type: 'object', description: 'update: merge into asset props to change defaults for new placements; placed clips keep their own props (use update_item_props for those).' },
        favorite: { type: 'boolean', description: 'update: favorite flag.' },
        sourceTimecode: {
          type: 'object',
          description: 'Normalized embedded timecode: {frameCount, frameRate:{numerator,denominator}, dropFrame}.',
          properties: {
            frameCount: { type: 'number' },
            frameRate: {
              type: 'object',
              properties: { numerator: { type: 'number' }, denominator: { type: 'number' } },
              required: ['numerator', 'denominator'],
            },
            dropFrame: { type: 'boolean' },
          },
          required: ['frameCount', 'frameRate', 'dropFrame'],
        },
        captureClock: {
          type: 'object',
          description: 'Normalized capture clock with the same exact structure as sourceTimecode.',
          properties: {
            frameCount: { type: 'number' },
            frameRate: {
              type: 'object',
              properties: { numerator: { type: 'number' }, denominator: { type: 'number' } },
              required: ['numerator', 'denominator'],
            },
            dropFrame: { type: 'boolean' },
          },
          required: ['frameCount', 'frameRate', 'dropFrame'],
        },
        clearSourceTimecode: { type: 'boolean', description: 'update: remove embedded source timecode metadata.' },
        clearCaptureClock: { type: 'boolean', description: 'update: remove capture clock metadata.' },
        confirm: { type: 'boolean', description: 'delete: confirm deletion when clips still reference the asset (confirmImpact).' },
      },
      required: ['action', 'assetId'],
    },
  },
];

export const EDIT_ASSET_TOOL_NAMES = new Set(EDIT_ASSET_TOOL_SCHEMAS.map((t) => t.name));
