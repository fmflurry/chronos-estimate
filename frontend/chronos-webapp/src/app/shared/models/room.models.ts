export interface WorkItem {
  id: number;
  fields: {
    'System.Title': string;
    [key: string]: unknown;
  };
}

export interface StateChangeData {
  state: 'idle' | 'analysis' | 'deliberation' | 'reveal';
  workItem?: WorkItem;
}

