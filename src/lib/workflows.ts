export type WorkflowStepStatus = "queued" | "running" | "succeeded" | "failed" | "skipped";

export type WorkflowStep = {
  id: string;
  title: string;
  summary: string;
  status: WorkflowStepStatus;
  durationMs?: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  logs: string[];
};

export type Workflow = {
  id: string;
  name: string;
  description: string;
  tags: string[];
  runId: string;
  environment: "local" | "staging" | "production";
  updatedAt: number;
  steps: WorkflowStep[];
};

function minutesAgo(mins: number) {
  return Date.now() - mins * 60_000;
}

export const mockWorkflows: Workflow[] = [
  {
    id: "wf_research_brief",
    name: "Research → Brief",
    description: "Turn a vague question into a grounded brief with sources and open risks.",
    tags: ["research", "brief", "sources"],
    runId: "run_0192",
    environment: "local",
    updatedAt: minutesAgo(12),
    steps: [
      {
        id: "s_intake",
        title: "Intake",
        summary: "Normalize request, extract constraints, propose plan.",
        status: "succeeded",
        durationMs: 1830,
        inputs: { prompt: "Create a policy summary for vendors." },
        outputs: { constraints: ["1 page", "plain language"], risks: ["missing legal review"] },
        logs: [
          "[intake] Parsed request and constraints",
          "[intake] Identified stakeholders: legal, procurement, security",
          "[intake] Drafted initial outline",
        ],
      },
      {
        id: "s_research",
        title: "Targeted research",
        summary: "Collect references and quotes; note conflicts and gaps.",
        status: "running",
        durationMs: 14500,
        inputs: { queries: ["vendor security policy template", "SOC2 minimum clauses"] },
        outputs: { sourcesFound: 7, openQuestions: 2 },
        logs: [
          "[research] Searching…",
          "[research] Found 3 relevant templates; extracting clauses",
          "[research] Noted ambiguity around data retention requirements",
        ],
      },
      {
        id: "s_synthesize",
        title: "Synthesize brief",
        summary: "Write summary, decisions, and next actions with owners.",
        status: "queued",
        inputs: { audience: "Procurement", tone: "direct" },
        outputs: {},
        logs: ["[synthesize] waiting for research to complete…"],
      },
    ],
  },
  {
    id: "wf_rag_eval",
    name: "RAG Evaluation Run",
    description: "Evaluate retrieval + generation quality across a dataset of questions.",
    tags: ["rag", "eval", "metrics"],
    runId: "run_0448",
    environment: "staging",
    updatedAt: minutesAgo(58),
    steps: [
      {
        id: "s_load",
        title: "Load dataset",
        summary: "Load questions, ground-truth passages, and expected answers.",
        status: "succeeded",
        durationMs: 820,
        inputs: { dataset: "qa_eval_v3.jsonl" },
        outputs: { questions: 250 },
        logs: ["[load] Loaded 250 items", "[load] Schema validated"],
      },
      {
        id: "s_retrieve",
        title: "Retrieve",
        summary: "Run retrieval against index; record recall and latency.",
        status: "failed",
        durationMs: 11240,
        inputs: { topK: 8, index: "docs_v12" },
        outputs: { error: "Index shard 3 timeout" },
        logs: [
          "[retrieve] topK=8 index=docs_v12",
          "[retrieve] shard=3 request timed out after 10s",
          "[retrieve] aborting run",
        ],
      },
      {
        id: "s_generate",
        title: "Generate",
        summary: "Generate answers with citations; compute faithfulness.",
        status: "skipped",
        inputs: { model: "gpt-4.1-mini", citations: true },
        outputs: {},
        logs: ["[generate] skipped because retrieval failed"],
      },
    ],
  },
  {
    id: "wf_agent_triage",
    name: "Agent Triage",
    description: "Route issues to the right playbook and produce an actionable first response.",
    tags: ["routing", "support", "playbooks"],
    runId: "run_1203",
    environment: "production",
    updatedAt: minutesAgo(180),
    steps: [
      {
        id: "s_classify",
        title: "Classify",
        summary: "Predict category and urgency; extract entities.",
        status: "succeeded",
        durationMs: 490,
        inputs: { subject: "Billing mismatch", body: "Charged twice for March" },
        outputs: { category: "billing", urgency: "high", entities: ["invoice", "March"] },
        logs: ["[classify] billing/high", "[classify] entities: invoice, March"],
      },
      {
        id: "s_route",
        title: "Route",
        summary: "Select playbook + owner; assemble required checks.",
        status: "succeeded",
        durationMs: 730,
        inputs: { category: "billing", urgency: "high" },
        outputs: { playbook: "billing.double_charge", owner: "support-billing" },
        logs: ["[route] playbook=billing.double_charge owner=support-billing"],
      },
      {
        id: "s_draft",
        title: "Draft response",
        summary: "Write first response with next steps and required info.",
        status: "succeeded",
        durationMs: 2410,
        inputs: { tone: "empathetic", includeChecklist: true },
        outputs: { responseLength: 842 },
        logs: ["[draft] drafted reply with checklist", "[draft] included refund policy link"],
      },
    ],
  },
];

