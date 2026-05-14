# Dynamic Prompt Assembly Research

**Date**: 2026-05-13
**Scope**: Query-dependent system prompts, dynamic context loading, prompt caching optimization
**Sources**: AgentPatterns.ai, arXiv papers (ID-RAG, L-RAG), OpenClaw production metrics, vLLM Semantic Router, n8n workflow builder, OpenRouter docs, OpenAI/Anthropic best practices

---

## 1. Query-Dependent System Prompts in Production

**Yes, extensively used.** Production systems assemble system prompts from modular sections rather than monolithic static text.

### Pattern: Priority-Ordered Section Assembly

From AgentPatterns.ai production guidance:
```typescript
const sections = [
  { priority: 10, content: CORE_IDENTITY, cacheable: true },      // Always included
  { priority: 25, content: TOOL_SCHEMAS, cacheable: true },       // Always included  
  { priority: 45, content: SAFETY_RULES, cacheable: true },       // Always included
  { priority: 60, content: MODE_PLANNING, cacheable: false },     // Mode-specific
  { priority: 75, content: MODE_EXECUTION, cacheable: false },    // Mode-specific
  { priority: 80, content: PROVIDER_CLAUDE, cacheable: true },    // Provider-specific
  { priority: 90, content: SESSION_STATE, cacheable: false },     // Dynamic per-request
]

function assembleSystemPrompt(mode: 'planning' | 'execution', provider: string) {
  return sections
    .filter(section => {
      if (section.priority === 60 && mode !== 'planning') return false
      if (section.priority === 75 && mode !== 'execution') return false
      if (section.priority === 80 && provider !== 'anthropic') return false
      return true
    })
    .sort((a, b) => a.priority - b.priority)
    .map(s => s.content)
    .join('\n\n')
}
```

Source: [AgentPatterns.ai - Dynamic System Prompt Composition](https://agentpatterns.ai/context-engineering/dynamic-system-prompt-composition/)

### Pattern: Cache Boundary Control

OpenClaw splits system prompts into stable prefix (cacheable) and volatile suffix (dynamic):
```typescript
const systemPrompt = {
  stablePrefix: `
    # Core Identity
    You are a coding assistant...
    # Tool Definitions
    ${toolSchemas}
    ---CACHE_BOUNDARY---`,
  volatileSuffix: `
    # Runtime State
    ${heartbeatMd}
    # Current Timestamp: ${Date.now()}`
}
```

Production deployment shows **~10-12k tokens saved per turn** via cache boundary.

Source: [OpenClaw Issue #9600](https://github.com/openclaw/openclaw/issues/9600)

---

## 2. Dynamic Context Loading: Instruction-Tool Retrieval (ITR)

Academic Evidence: arXiv paper (Feb 2026) demonstrates **95% token reduction** via per-step retrieval:

> "ITR treats both instructions and tools as retrievable resources. Instead of retrieving domain knowledge as in traditional RAG, ITR retrieves the instructions and tools themselves... retrieves only what a specific step requires based on the current context, and dynamically assembles a minimal per-step prompt."

Results from production deployment:
- Baseline: 30,000 tokens/step (monolithic prompt + all tools)
- ITR: 1,500 tokens/step (retrieved subset)
- Reduction: **95% token savings**
- Tool accuracy: **+32% improvement** (fewer irrelevant options)
- Episode cost: **-70% total reduction**

Source: [arXiv:2602.17046 - Instruction-Tool Retrieval](https://arxiv.org/pdf/2602.17046)

### Implementation: Query Classification → Context Selection

Production Pattern from vLLM Semantic Router:
```typescript
class SemanticRouter {
  async route(query: string): Promise<RouteDecision> {
    // Stage 1: Keyword matching (1-2ms, high interpretability)
    const keywordMatch = this.keywordMatcher.match(query)
    if (keywordMatch.confidence > 0.9) {
      return this.loadContextForTask(keywordMatch.taskType)
    }
    
    // Stage 2: Embedding similarity (5-20ms, handles paraphrasing)
    const queryEmbedding = await this.embed(query)
    const similarRoutes = this.vectorStore.similaritySearch(queryEmbedding, topK=5)
    
    // Stage 3: Domain classification (BERT/LoRA, for specialized domains)
    const domain = await this.domainClassifier.classify(query)
    
    return this.fuseSignals({ keywordMatch, similarRoutes, domain })
  }
}
```

Source: [vLLM Semantic Router](https://blog.vllm.ai/2025/11/19/signal-decision.html)

---

## 3. Performance Trade-offs: Full vs. Dynamic Subset

### Token Budget Allocation (Production Standards)

From MyEngineeringPath 2026 production guide:

| Component | Token Allocation | Percentage |
|-----------|-----------------|------------|
| System prompt | 2,000 | 1.6% |
| Few-shot examples | 3,000 | 2.3% |
| RAG context | 40,000 | 31.3% |
| User input | 15,000 | 11.7% |
| Safety buffer | 4,000 | 3.1% |
| Reserved output | 64,000 | 50% |

**Key insight**: RAG context is the largest variable cost — not conversation history.

### Lazy Retrieval (L-RAG): Adaptive Loading

arXiv Jan 2026 paper shows **26-46% retrieval reduction** via entropy-based gating:

```typescript
class LazyRAG {
  async generate(query: string): Promise<string> {
    // Tier 1: Compact document summary (always included, ~500 tokens)
    const summaryContext = await this.getDocumentSummary()
    
    // Generate initial response, monitor entropy
    const [response, entropy] = await this.llm.generateWithEntropy(query, summaryContext)
    
    // Tier 2: Only activate if model shows uncertainty
    if (entropy > this.tau) {
      const chunks = await this.vectorDB.search(query, topK=5)
      return this.llm.generate(query, summaryContext + chunks)
    }
    
    return response
  }
}
```

Results:
- τ=1.0: 26% retrieval reduction, 76.0% accuracy
- τ=0.5: 8% retrieval reduction, 78.2% accuracy  
- τ=1.5: 46% retrieval reduction, 71.6% accuracy

Source: [arXiv:2601.06551 - L-RAG](https://arxiv.org/pdf/2601.06551v1)

### Cost Comparison: Static vs. Dynamic

| Strategy | Tokens/Request | Cost/1K Requests (Claude 3.5) |
|----------|---------------|------------------------------|
| Full monolithic prompt | 30,000 | $0.30 |
| Dynamic subset (ITR) | 1,500 | $0.015 |
| **Savings** | **95%** | **95%** |

---

## 4. Implementation Patterns

### Pattern 1: Multi-Stage Routing (Production Standard)

From Gemini API Semantic Router production guide:
```typescript
class ProductionRouter {
  async route(query: string): Promise<ModelSelection> {
    // Stage 1: Rule-based (1-2ms, 40% of queries resolved here)
    const ruleResult = this.ruleRouter.route(query)
    if (ruleResult.confidence > 0.9) return ruleResult
    
    // Stage 2: Semantic similarity (5-20ms, 45% resolved)
    const semanticResult = await this.semanticRouter.route(query)
    if (semanticResult.confidence > 0.85) return semanticResult
    
    // Stage 3: LLM classifier (50-100ms, fallback for ambiguous cases)
    return await this.llmClassifier.route(query)
  }
}
```

### Pattern 2: Confidence-Gated Fallback

From ITR paper implementation:
```typescript
function selectInstructionsAndTools(query: string, stepContext: dict) {
  const instructionCandidates = vectorSearch(query, index='instructions', k=8)
  const toolCandidates = vectorSearch(query, index='tools', k=10)
  
  // Confidence gating: only include if similarity > threshold
  const selectedInstructions = instructionCandidates.filter(inst => inst.similarity > 0.75)
  const selectedTools = toolCandidates.filter(tool => tool.similarity > 0.70)
  
  // Fallback: if too few selected, request "tool discovery"
  if (selectedTools.length < 2) selectedTools.push(TOOL_DISCOVERY_TOOL)
  
  // Always include safety overlay (small, non-negotiable)
  selectedInstructions.unshift(SAFETY_POLICY)
  
  return assemblePrompt(selectedInstructions, selectedTools)
}
```

---

## 5. Prompt Caching: OpenRouter Support

OpenRouter supports prompt caching with two modes:

| Provider | Caching Type | Configuration |
|----------|-------------|---------------|
| OpenAI | Implicit (auto) | None needed |
| DeepSeek | Implicit (auto) | None needed |
| Gemini 2.5 | Implicit + Explicit | Optional cache_control |
| Anthropic | Explicit required | `cache_control: { type: 'ephemeral' }` |
| Grok, Groq | Implicit (auto) | None needed |

### Critical: Cache Structure

```typescript
// ✅ CORRECT: Stable prefix cached, dynamic content in user message
const messages = [
  {
    role: 'system',
    content: [
      { type: 'text', text: CORE_IDENTITY, cache_control: { type: 'ephemeral', ttl: '1h' } },
      { type: 'text', text: TOOL_SCHEMAS, cache_control: { type: 'ephemeral', ttl: '1h' } },
    ]
  },
  {
    role: 'user',
    content: [
      { type: 'text', text: `Current session state: ${sessionState}` }, // Dynamic, not cached
      { type: 'text', text: `User query: ${query}` },
    ]
  }
]

// ❌ WRONG: Dynamic content after cache_control invalidates entire cache
const messages = [
  {
    role: 'system',
    content: [
      { type: 'text', text: CORE_IDENTITY, cache_control: { type: 'ephemeral' } },
      { type: 'text', text: `Dynamic session: ${sessionState}` }, // ← Invalidates cache above!
    ]
  }
]
```

### Cost Impact

Real-world analysis (6,000 Claude 4.6 Opus calls):
- 5-minute TTL: $443/month
- 1-hour TTL: $319/month (**28% reduction**)
- ROI: **8:1 payoff ratio** (spend $17 more on writes, save $137 on misses)

Source: [GitHub Issue #16848](https://github.com/anomalyco/opencode/issues/16848)

---

## 6. Persona Adherence: Long vs. Short System Prompts

### ID-RAG Research (arXiv:2509.25299)

Tested persona coherence across 500+ agent sessions:

| Model | Full Context (100K+) | ID-RAG Retrieved (10K) |
|-------|---------------------|----------------------|
| GPT-4o | 6.2/10 | 8.7/10 |
| GPT-4o mini | 4.1/10 | 7.9/10 |
| Qwen2.5-7B | 5.8/10 | 8.1/10 |

**Key insight**: Targeted, concise context OUTPERFORMS full context injection for persona adherence. Less capable models show dramatic improvement.

### "Lost in the Middle" Phenomenon

Stanford/Berkeley research confirms LLMs recall information at beginning and end of prompts much better than content in the middle.

**Implication for A.G.I:**
- Place core persona traits at START (cached, high recall)
- Place dynamic context at END (fresh, high recall)
- Avoid burying critical instructions in the MIDDLE

---

## 7. Context Window Limits (2026)

| Model | Context Window | Max Output |
|-------|---------------|-----------|
| Claude Opus 4.7 | 1M tokens | 128K tokens |
| GPT-5.4 | 1M tokens | 128K tokens |
| Gemini 2.5 Pro | 1M-2M tokens | 64K tokens |
| **Free Models** | | |
| Llama 3.3 70B | 128K tokens | 8K tokens |
| Qwen 2.5 72B | 128K tokens | 8K tokens |
| DeepSeek V3 | 128K tokens | 8K tokens |

**Note**: System prompt counts toward input tokens. No separate "system prompt limit" exists.

---

## 8. Recommendations for A.G.I

### Phase 1 (Current): Static Assembly

```typescript
// All 7 files, priority-ordered, <2000 tokens
const PROFILE_ORDER = [
  'persona.md',    // First = primacy bias
  'about.md',
  'skills.md',
  'experience.md',
  'projects.md',
  'education.md',
  'contact.md',    // Last = recency bias
]
```

### Phase 2 (RAG): Static Prefix + Dynamic Suffix

```typescript
// Stable prefix (cached, ~800 tokens)
const stablePrefix = `
  --- PERSONA ---
  [persona.md content]
  
  --- ABOUT ---
  [about.md content]
`

// Dynamic suffix (retrieved, ~1000 tokens)
const volatileSuffix = `
  --- RELEVANT CONTEXT ---
  [RAG chunks from vector store]
`
```

### Key Decisions Applied

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Assembly | Static (all files) | Cacheable, simple, sufficient for 2000 tokens |
| Order | Priority-ordered | Most important info first/last (primacy/recency bias) |
| Delimiters | Yes (`--- SECTION ---`) | Production standard, helps LLM parse |
| Return type | `{ stablePrefix, volatileSuffix }` | Forward-compatible for Phase 2 RAG |
| Token target | <2000 | Research shows shorter = better persona adherence |
| Dynamic loading | Phase 2 only (RAG chunks) | File subsetting rejected; RAG chunks are the production pattern |

---

## Sources

- [AgentPatterns.ai - Dynamic System Prompt Composition](https://agentpatterns.ai/context-engineering/dynamic-system-prompt-composition/)
- [OpenClaw Issue #9600](https://github.com/openclaw/openclaw/issues/9600)
- [arXiv:2602.17046 - Instruction-Tool Retrieval](https://arxiv.org/pdf/2602.17046)
- [vLLM Semantic Router](https://blog.vllm.ai/2025/11/19/signal-decision.html)
- [arXiv:2601.06551 - L-RAG](https://arxiv.org/pdf/2601.06551v1)
- [arXiv:2509.25299 - ID-RAG](https://arxiv.org/html/2509.25299v1)
- [OpenRouter Prompt Caching Docs](https://openrouter.ai/docs/guides/best-practices/prompt-caching)
- [GitHub Issue #16848 - OpenRouter TTL Analysis](https://github.com/anomalyco/opencode/issues/16848)
- [n8n Cache Control Implementation](https://github.com/n8n-io/n8n/blob/master/packages/%40n8n/ai-workflow-builder.ee/src/utils/cache-control/helpers.ts)
- Stanford/Berkeley "Lost in the Middle" research
- MyEngineeringPath Token Budgeting Guide 2026
- Alex Cloudstar Production Guide 2026
