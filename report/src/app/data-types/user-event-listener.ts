export interface UserEventListener {
  id: number;
  description: string;
  selector: string;
  type: string;
  eventGraphMetadata: EventMetadata[],
  eventGraphURLs: EventGraphURLs;
}

export interface EventMetadata {
  id: number;
  kind: string;
  url: string;
}

export interface EventGraphURLs {
  actionsOnly: string;
  full: string;
}
