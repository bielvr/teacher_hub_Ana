export interface TopicItem {
  id: string;
  title: string;
  description: string;
  name?: string;
  items?: string[];
}

export interface TimelineStep {
  id: string;
  title: string;
  duration?: number | string;
  description: string;
}

export interface MaterialResourceItem {
  id: string;
  title: string;
  type: 'pdf' | 'link' | 'video' | 'audio' | 'document';
  url: string;
  size?: string;
  fileName?: string;
}

export interface ChecklistItem {
  text: string;
  done: boolean;
}

export interface PlanningTrackOption {
  id: string;
  title: string;
  modules: {
    id: string;
    title: string;
  }[];
}

export interface FlatLessonItem {
  id: string;
  moduleId: string;
  title: string;
  trackTitle: string;
  trackId: string;
  moduleTitle: string;
  orderIndex: number;
  prepStatus: 'need_prep' | 'in_progress' | 'ready';
  communicativeGoals?: string;
  notes?: string;
  checklist?: ChecklistItem[];
  vocabulary?: string;
  grammar?: string;
  topics?: TopicItem[];
  timeline?: TimelineStep[];
  materials?: MaterialResourceItem[];
  coverImageUrl?: string;
  publishedToMaterials?: boolean;
  materialsCount: number;
}
