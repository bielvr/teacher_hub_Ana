export type PedagogicalObjective =
  | 'Exercício e prática'
  | 'Revisão'
  | 'Avaliação ou quiz'
  | 'Leitura e interpretação'
  | 'Produção escrita'
  | 'Projeto ou entrega'
  | 'Personalizado';

export type TargetSkill =
  | 'Gramática'
  | 'Vocabulário / Terminologia'
  | 'Leitura'
  | 'Produção escrita'
  | 'Compreensão oral'
  | 'Produção oral'
  | 'Pronúncia'
  | 'Shadowing / Prática guiada de fala'
  | 'Outras';

export const PEDAGOGICAL_OBJECTIVES: PedagogicalObjective[] = [
  'Exercício e prática',
  'Revisão',
  'Avaliação ou quiz',
  'Leitura e interpretação',
  'Produção escrita',
  'Projeto ou entrega',
  'Personalizado',
];

export const TARGET_SKILLS: TargetSkill[] = [
  'Gramática',
  'Vocabulário / Terminologia',
  'Leitura',
  'Produção escrita',
  'Compreensão oral',
  'Produção oral',
  'Pronúncia',
  'Shadowing / Prática guiada de fala',
  'Outras',
];

export type ResourceBlockType =
  | 'text'
  | 'image'
  | 'video'
  | 'audio'
  | 'pdf'
  | 'link';

export type QuestionBlockType =
  // 1 a 11: Correção Automática
  | 'multiple_choice'
  | 'multiple_select'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer_auto'
  | 'translation'
  | 'error_correction'
  | 'ordering'
  | 'match_columns'
  | 'sequence_ranking'
  | 'categorize'
  // 12 a 14: Correção Manual
  | 'short_answer_manual'
  | 'long_answer_manual'
  | 'open_production_manual';

export interface ResourceBlock {
  id: string;
  kind: 'resource';
  type: ResourceBlockType;
  title: string;
  url?: string;
  content_markdown?: string;
}

export interface QuestionBlock {
  id: string;
  kind: 'question';
  type: QuestionBlockType;
  prompt: string;
  instructions?: string;
  // Configurações específicas por tipo
  options?: string[]; // multiple_choice, multiple_select, true_false
  correct_options?: string[]; // multiple_select, multiple_choice
  answer_key?: string; // multiple_choice, true_false, short_answer_auto, translation, error_correction
  accepted_variants?: string[]; // short_answer_auto, translation, fill_blank
  template_text?: string; // fill_blank (ex: "The cat [sat] on the [mat].")
  error_sentence?: string; // error_correction
  items_to_order?: string[]; // ordering, sequence_ranking
  matching_pairs?: { left: string; right: string }[]; // match_columns
  categories?: { name: string; items: string[] }[]; // categorize
  evaluation_criteria?: string; // short_answer_manual, long_answer_manual, open_production_manual
  min_words?: number; // long_answer_manual, open_production_manual
  allow_audio_submission?: boolean; // open_production_manual
}

export type ActivityBlock = ResourceBlock | QuestionBlock;

export type CorrectionType = 'auto' | 'manual' | 'mixed' | 'external';

export const AUTOMATIC_QUESTION_TYPES: QuestionBlockType[] = [
  'multiple_choice',
  'multiple_select',
  'true_false',
  'fill_blank',
  'short_answer_auto',
  'translation',
  'error_correction',
  'ordering',
  'match_columns',
  'sequence_ranking',
  'categorize',
];

export const MANUAL_QUESTION_TYPES: QuestionBlockType[] = [
  'short_answer_manual',
  'long_answer_manual',
  'open_production_manual',
];

export function computeCorrectionType(blocks: ActivityBlock[]): CorrectionType {
  const questionBlocks = blocks.filter((b): b is QuestionBlock => b.kind === 'question');
  if (questionBlocks.length === 0) return 'manual';

  const hasAuto = questionBlocks.some((q) => AUTOMATIC_QUESTION_TYPES.includes(q.type));
  const hasManual = questionBlocks.some((q) => MANUAL_QUESTION_TYPES.includes(q.type));

  if (hasAuto && hasManual) return 'mixed';
  if (hasAuto && !hasManual) return 'auto';
  return 'manual';
}

export interface ActivityMetadata {
  category: PedagogicalObjective;
  target_skills: TargetSkill[];
  curricular_track_id?: string;
  curricular_module_id?: string;
  curricular_lesson_id?: string;
  correction_type: CorrectionType;
  no_correction_needed?: boolean;
  status: 'published' | 'draft';
  blocks: ActivityBlock[];
  items?: any[]; // compatibilidade com estrutura anterior
  resources?: any[]; // compatibilidade
  item_count: number;
  resource_count: number;
  auto_count: number;
  manual_count: number;
}
