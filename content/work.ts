// Owner-maintained facts, as profile.ts is. Agents may restyle how this renders, but never edit it.
// The case studies from the owner's earlier portfolio. Plain data, so the pages, the assistant and
// the MCP server all read one source and a new study is one more entry.

export type Metric = { label: string; value: string };

/** One titled part of a study: a paragraph, a list of decisions with their reasons, or both. */
export type Section = {
  id: string;
  title: string;
  text?: string;
  points?: { lead: string; text: string }[];
};

export type CaseStudy = {
  slug: string;
  title: string;
  blurb: string;
  metrics: Metric[];
  /** The system left to right: each stage holds the parts that work side by side. */
  flow: string[][];
  sections: Section[];
  stack: string[];
};

export const COMPANY = "JPMorgan Chase";

export const caseStudies: CaseStudy[] = [
  {
    slug: "multi-agent-platform",
    title: "Multi-agent orchestration platform",
    blurb:
      "Production multi-agent workflows used by several thousand employees firm-wide. LangGraph orchestrates Claude Agent SDK and OpenAI Agents SDK. Each agent has persistent memory and calls internal tools. Irreversible actions pause for a human checkpoint.",
    metrics: [
      {
        label: "Manual processing cut on the flagship workflow",
        value: "~55%",
      },
      { label: "Employees using it firm-wide", value: "Several thousand" },
    ],
    flow: [
      ["Internal systems"],
      ["LangGraph orchestrator"],
      ["Claude agents", "GPT agents"],
      ["Human checkpoint on writes"],
      ["System of record"],
    ],
    sections: [
      {
        id: "problem",
        title: "The problem",
        text: "A handful of operational workflows ate analyst time every day. Each one had the same shape: pull data from 3-5 internal systems, summarize, decide, log. The decision was the only part that needed a human, and most of the time even that was reflex.",
      },
      {
        id: "shape",
        title: "The shape",
        text: "LangGraph as the orchestrator. Each node is an agent (Claude or GPT) with a narrow tool surface and persistent memory in Redis. Agents talk through typed message passing, not free-form chat. Anything that writes to a system of record pauses for a human checkpoint, with the proposed diff inline.",
      },
      {
        id: "decisions",
        title: "Key decisions",
        points: [
          {
            lead: "Typed messages between agents.",
            text: "Free-form chat between agents drifts in days. A schema doesn't.",
          },
          {
            lead: "Per-agent memory, not shared.",
            text: "Easier to evict, easier to debug. Cross-agent context flows through explicit handoff messages.",
          },
          {
            lead: "Human checkpoint on irreversible writes, never on reads.",
            text: "The bar for interrupting a human is high. Reads happen freely, writes pause.",
          },
          {
            lead: "Replay-from-step.",
            text: "Every agent invocation is logged with inputs and outputs. Failed runs replay from the failing step, not from scratch.",
          },
        ],
      },
      {
        id: "broke",
        title: "What broke",
        text: "The first version had agents calling each other recursively until token budget ran out. Now there's a depth limit and a per-run token cap enforced by the orchestrator, not the agents.",
      },
    ],
    stack: [
      "LangGraph",
      "Claude Agent SDK",
      "OpenAI Agents SDK",
      "Python",
      "React",
    ],
  },
  {
    slug: "hybrid-rag",
    title: "Hybrid retrieval pipeline",
    blurb:
      "Replaced an embedding-only RAG with a hybrid pipeline: dense plus sparse retrieval, cross-encoder re-ranking, indexed across Pinecone, Weaviate and pgvector depending on the use case. The pieces that mattered weren't the models. They were the eval harness and the index strategy per domain.",
    metrics: [
      { label: "Retrieval precision improvement", value: "~35%" },
      { label: "Eval cadence", value: "Nightly" },
    ],
    flow: [
      ["Query"],
      ["Dense retrieval", "Sparse retrieval (BM25)"],
      ["Cross-encoder re-rank"],
      ["Top passages to the model"],
    ],
    sections: [
      {
        id: "problem",
        title: "The problem",
        text: "The v1 RAG was embedding-only with a single index. Recall was fine on general queries. On the things that actually mattered, it missed. Acronym-heavy compliance docs. Code lookups where the symbol matters more than the prose around it, and the deeply nested policy text nobody chunks well.",
      },
      {
        id: "shape",
        title: "The shape",
        text: "Three retrievers run in parallel: dense (domain-tuned embeddings), sparse (BM25 over chunked text), and a small cross-encoder on the top-K union. Per use case, the index is whatever fits. Pinecone for the high-traffic general index. Weaviate where we needed hybrid out of the box. pgvector where the index lived next to relational data, so joins beat round-trips.",
      },
      {
        id: "decisions",
        title: "Key decisions",
        points: [
          {
            lead: "Per-domain index, not one big lake.",
            text: 'Compliance text, code, policy, customer correspondence. Each gets its own embedding model and chunking strategy. The "one giant index" pattern loses on every metric that matters.',
          },
          {
            lead: "The eval harness is the artifact.",
            text: "Nightly RAGAS runs against a versioned golden set. Every retrieval change ships behind that.",
          },
          {
            lead: "Re-ranker is small and aggressive.",
            text: "A bi-encoder gives you 100 candidates. The cross-encoder picks the 5 that matter. Skip this step and the LLM will quote the wrong document confidently.",
          },
        ],
      },
      {
        id: "broke",
        title: "What broke",
        text: "Early on we tuned for top-1 precision and the LLM started hallucinating where the source didn't quite answer the question. Now we tune for top-5 recall and let the model say \"I don't have that.\"",
      },
    ],
    stack: [
      "Pinecone",
      "Weaviate",
      "pgvector",
      "Cross-encoder re-ranking",
      "RAGAS",
    ],
  },
  {
    slug: "mcp-servers",
    title: "Internal MCP servers",
    blurb:
      "Custom Model Context Protocol servers that connect Claude to internal APIs and databases. Features that used to take a sprint now take a day or two.",
    metrics: [
      { label: "Typical feature ship time", value: "1-2 days vs 1 sprint" },
    ],
    flow: [
      ["A team's agent"],
      ["MCP servers, in-process"],
      ["Auth", "Rate limits", "Structured errors", "OTel traces"],
      ["Internal APIs", "Databases"],
    ],
    sections: [
      {
        id: "problem",
        title: "The problem",
        text: "Every team building on Claude was writing their own glue to internal systems. Auth, retry, schema, observability. Five times over, slightly differently each time.",
      },
      {
        id: "shape",
        title: "The shape",
        text: "A library of MCP servers, one per internal system, with a shared base that handles auth, rate limiting, structured errors, and OTel traces. Teams compose the ones they need. Adding a new tool means writing the resource handler, not the plumbing.",
      },
      {
        id: "decisions",
        title: "Key decisions",
        points: [
          {
            lead: "Servers are libraries, not services.",
            text: "Each team runs them in-process. No extra hop, no extra failure mode, no shared infra to operate.",
          },
          {
            lead: "Schema is enforced at the boundary.",
            text: "Tool inputs and outputs are Pydantic models. The LLM gets a clean schema; the caller gets typed responses.",
          },
          {
            lead: "Observability is mandatory, not optional.",
            text: "Every tool call logs to OTel with the prompt hash and the tool result. Audit is for free.",
          },
        ],
      },
      {
        id: "faster",
        title: "Why it sped things up",
        text: 'The old loop was "wire up auth, write the API client, handle retries, decide on a schema for the LLM, debug it for two days." The new loop is "import the server, write the tool function, ship."',
      },
    ],
    stack: ["MCP", "Python", "Anthropic API", "Internal APIs"],
  },
  {
    slug: "ai-gateway",
    title: "Model-agnostic AI gateway",
    blurb:
      "An AI gateway on top of AWS Bedrock and Azure OpenAI, with direct Anthropic API access for newer Claude models. Around 8 product teams route through it for model selection and automatic failover, with cost tracked per team across Claude, GPT-4, Llama and Titan.",
    metrics: [
      { label: "Product teams routing through", value: "~8" },
      { label: "Providers supported", value: "3 primary, 4+ models" },
    ],
    flow: [
      ["Product teams"],
      ["Unified request schema"],
      ["Routing by use case", "Automatic failover", "Cost per team"],
      ["AWS Bedrock", "Azure OpenAI", "Anthropic API"],
    ],
    sections: [
      {
        id: "problem",
        title: "The problem",
        text: "Each product team had picked a provider. Costs were everywhere and nowhere. When a provider degraded, the team that depended on it noticed in customer reports, not in dashboards.",
      },
      {
        id: "shape",
        title: "The shape",
        text: "One gateway with a unified request schema. Routes by use case, not by team preference: chat goes to Claude, structured extraction to whichever model is cheapest per token that week, multimodal to Vision-capable models. Automatic failover when a primary provider 5xx's. Cost tracked per team, per use case, per request.",
      },
      {
        id: "decisions",
        title: "Key decisions",
        points: [
          {
            lead: "Route on use case, not team preference.",
            text: "Teams don't pick models. Use cases do. The gateway has the routing table.",
          },
          {
            lead: "Failover is automatic and silent.",
            text: "Provider outages don't page anyone on the gateway team unless they're sustained.",
          },
          {
            lead: "Cost dashboards are public.",
            text: "Every team sees its spend in real time. The cost conversations stopped being arguments.",
          },
        ],
      },
    ],
    stack: [
      "AWS Bedrock",
      "Azure OpenAI",
      "Anthropic API",
      "Cost tracking",
      "Provider failover",
    ],
  },
  {
    slug: "document-ai",
    title: "Multimodal document pipelines",
    blurb:
      "Document and image processing pipelines on Claude Vision and GPT-4V, with Gemini added recently for cost reasons. Handles the first pass of compliance reviews that used to sit with analysts.",
    metrics: [
      { label: "Use case", value: "First-pass compliance review" },
      { label: "Originally done by", value: "Human analysts" },
    ],
    flow: [
      ["Scanned and digital documents"],
      ["OCR where needed"],
      ["Claude Vision", "GPT-4V"],
      ["Gemini on disagreement"],
      ["JSON report for the analyst"],
    ],
    sections: [
      {
        id: "problem",
        title: "The problem",
        text: "Compliance review meant analysts opening PDFs and scanning for specific patterns. Hundreds a day. The patterns were teachable but rote. The work was the kind that makes good analysts quit.",
      },
      {
        id: "shape",
        title: "The shape",
        text: "A pipeline that takes scanned and digital documents, OCRs where needed, hands them to a Vision model with a structured extraction prompt, and produces a JSON report flagged with the patterns found. The analyst reviews the JSON, not the PDF. Spot-check rate is much higher than full read rate.",
      },
      {
        id: "decisions",
        title: "Key decisions",
        points: [
          {
            lead: "Structured extraction, not summarization.",
            text: "Summaries hide. A schema forces the model to commit to a yes/no per pattern, with citations to the page.",
          },
          {
            lead: "Multi-model pass on disagreement.",
            text: "When Claude and GPT-4V disagree on a flag, the doc goes to Gemini as tiebreaker. Cheaper than escalating to human first.",
          },
          {
            lead: "The human reviews the report, not the doc.",
            text: "They open the doc only when the report flags something.",
          },
        ],
      },
      {
        id: "broke",
        title: "What broke",
        text: 'Early prompts asked for "anything suspicious." That returned everything. The current prompts enumerate the patterns by name with examples and require citation. False positives dropped, recall held.',
      },
    ],
    stack: [
      "Claude Vision",
      "GPT-4V",
      "Gemini",
      "OCR",
      "Compliance review automation",
    ],
  },
];
