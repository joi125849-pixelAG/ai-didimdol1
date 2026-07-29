export type SubjectType = 'korean' | 'math' | 'social' | 'science';
export type ScopeType = 'word' | 'phrase' | 'sentence' | 'paragraph' | 'whole';
export type QuestionType = 'multiple_choice' | 'short_answer';
export type VisualType =
  | 'quantity'
  | 'sequence'
  | 'causeEffect'
  | 'inputProcessOutput'
  | 'comparison'
  | 'spatial'
  | 'conceptMap';

export interface HelpTarget {
  id: string;
  scope: ScopeType;
  text: string;
  simpleMeaning: string;
}

export interface Level1Preview {
  description: string;
  visualType: VisualType;
  entities: VisualEntity[];
  connections: VisualConnection[];
  keyFacts: string[];
  checkQuestion: string;
}

export interface VisualEntity {
  label: string;
  role: string;
  iconHint: string;
  quantity?: number;
}

export interface VisualConnection {
  from: string;
  to: string;
  label: string;
  direction: string;
}

export interface Level2Preview {
  easyRewrite: string[];
  chunks: string[];
}

export interface Level3Preview {
  question: string;
  questionType: QuestionType;
  options?: string[];
}

export interface WholeTextHelp {
  topic: string;
  situation: string;
  importantInformation: string[];
  target: string;
}

export interface ScaffoldAnalysisResponse {
  subject: SubjectType;
  originalText: string;
  summary: string;
  helpTargets: HelpTarget[];
  level1Preview: Level1Preview;
  level2Preview: Level2Preview;
  level3Preview: Level3Preview;
  wholeTextHelp: WholeTextHelp;
}
