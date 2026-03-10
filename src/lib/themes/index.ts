import type { ExperienceConfig, ExperienceId } from '../theme-config';
import { bioluminescent } from './bioluminescent';
import { whitevoid } from './whitevoid';

export const EXPERIENCES: Record<ExperienceId, ExperienceConfig> = {
  bioluminescent,
  whitevoid,
};

export { bioluminescent, whitevoid };
export type { ExperienceConfig, ExperienceId } from '../theme-config';
