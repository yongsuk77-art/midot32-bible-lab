export type Depth = "standard" | "deep";
export type Testament = "auto" | "old" | "new";

export interface ResearchInput {
  reference: string;
  passage: string;
  testament: Testament;
  focus: string;
  depth: Depth;
}

export interface ResearchSection {
  id: string;
  title: string;
  markdown: string;
}

export interface ResearchResult {
  id: string;
  createdAt: string;
  input: ResearchInput;
  sections: ResearchSection[];
  meta: {
    model: string;
    durationMs: number;
    caution: string;
  };
}

export interface ApiError {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
}
