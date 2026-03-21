# Collaboration Log — CWP Standard Development

Human–AI collaboration log for The Synthesis hackathon submission.

**Agent:** Claude Code (claude-opus-4-6) | **Human:** Dawoon Jung

---

## 1. Problem Discovery — "Why can't AI agents use wallets?"

**Human:** We have an AI agent wallet project — a chat-based crypto wallet where users talk to an AI instead of clicking buttons. The backend routes to GPT-4o, and the client executes wallet tools locally. But we realized there's no standard for how this should work. Every project builds their own integration.

**Agent:** That's the N×M problem. N wallet implementations × M AI frameworks, each with custom glue code. MCP exists for general tool connectivity, but it's server-based — private keys would have to leave the client process. That's a non-starter for non-custodial wallets. And existing wallet standards like EIP-1193 assume UI popups for every transaction — incompatible with AI automation.

**Human:** Exactly. So instead of just building our wallet, we should propose a standard interface that any wallet can implement and any AI app can consume.

**Agent:** That's a much stronger hackathon submission. Instead of "we built a wallet," it becomes "we defined the missing standard and proved it works." The Synthesis hackathon's "Agents that Pay" track is literally asking: "How do you know your agent did what you asked with your money?" Your standard answers that with manifest-declared risk levels and in-process execution.

---

## 2. Architecture Decision — "In-process, not server-based"

**Human:** MCP sends everything through a server. Why can't wallets do the same?

**Agent:** Because of the key custody model. In MCP, the tool server holds the execution logic — that's fine for a weather API. But for a non-custodial wallet, the private key must stay on the client. If you send the key to an MCP server, you've turned a non-custodial wallet into a custodial one. The security guarantee is broken.

**Human:** So the wallet module has to run inside the AI application's process.

**Agent:** Right. The module is a JS file that the host imports directly. `discoverTools()` scans the manifest to find what it can do, `executeTool()` runs the action. The private key is used for signing inside the same process — it never appears in any API call, network request, or LLM prompt. Only the RPC calls to the blockchain cross the network.

**Human:** That's the key insight we need to communicate. Keys stay in-process. Only RPC calls go out.

---

## 3. Manifest Design — "LLM-neutral, convert at runtime"

**Human:** The tool schema format is different for every LLM. OpenAI uses `parameters`, Claude uses `input_schema`, Gemini uses uppercase types. How do we handle this?

**Agent:** Don't pick one. Define a neutral manifest format based on JSON Schema, and convert at runtime. The manifest uses `input` and `output` — not `parameters` or `input_schema`. A converter layer (`convertToOpenAITools()`) transforms it to whatever the LLM expects.

**Human:** So a wallet developer writes the manifest once, and it works with any LLM?

**Agent:** Exactly. That's how you solve the N×M problem. Wallet developers target the CWP manifest spec. AI app developers implement the CWP runtime once. New LLM? Add a converter. New wallet? Add a module. Neither side needs to know about the other. Right now we have the OpenAI converter implemented. Claude has the interface ready — adding it means implementing one `chat()` function. The manifests and tool modules don't change at all.

---

## 4. Security Model — "Secure by default, opt-out with consent"

**Human:** If we're running third-party modules inside the host process, that's a huge attack surface. A malicious module could access other modules' keys, poison the LLM context, or trigger unauthorized transactions.

**Agent:** That's why the default posture needs to be maximum restriction. The principles: single-module session (one module at a time), single-turn conversation (no context carried between messages), risk level enforcement (high-risk actions always pause for confirmation), in-process key isolation (architectural guarantee), and one-way calls (modules can't call the LLM).

**Human:** But sometimes users need multiple modules or multi-turn context.

**Agent:** That's the "opt-out with consent" part. Users can explicitly select multiple modules via the module selector or click Continue for multi-turn. But the key insight is: relaxation is always user-initiated. A module can't request multi-module access. A prompt injection can't trigger Continue. The LLM can't skip high-risk confirmation. The attack surface only expands when the human deliberately chooses it.

**Human:** So the security model has three tiers: always enforced (can't bypass), default-on (user can relax), and the boundary between them is clear.

**Agent:** Exactly. And this maps directly to the OWASP Top 10 for MCP. Goal hijacking? Limited by single-module default. Context poisoning? Blocked by single-turn default. Privilege escalation? Blocked by module isolation. Data exfiltration? Architectural guarantee — keys never appear in any API payload. Each threat has a specific mitigation.

---

## 5. Risk Level Design — "Two tiers, not four"

**Human:** We initially considered multiple risk levels: low, medium, high, critical. But it felt over-engineered for a wallet context.

**Agent:** For blockchain operations, there's really only two categories: read (no asset impact, no signing needed) and write (irreversible, requires private key). A `getBalance` call can be repeated a thousand times with zero risk. A `sendETH` call can drain the wallet in one shot. The gap between them is binary, not gradual.

**Human:** So we simplified to `riskLevel: "low"` and `riskLevel: "high"`. Low = read operations, execute freely. High = write operations, always confirm.

**Agent:** And it's enforced at the runtime level — the `isHighRisk()` check in the executor looks up the manifest's riskLevel. When the agent loop encounters a high-risk tool call, it stops the loop, returns `needsConfirmation: true` with the pending tool call details, and waits. The frontend shows a confirmation card with the action name and parameters. Only after the user clicks Confirm does the loop resume via `/api/chat/confirm`. Reject adds a tool response to the history ("Action rejected by user") and ends the session. No amount of prompt engineering bypasses this — it's a hard gate in the execution path, not a suggestion to the LLM.

---

## 6. Proxy Server Pivot — "Separate keys from the client"

**Human:** We have API keys for Alchemy, Etherscan, Basescan, CoinGecko scattered across the client environment variables. That's a lot of setup for anyone trying to run the demo. Can we simplify?

**Agent:** Move all the infrastructure keys to a proxy server. The client only needs two things: `OPENAI_API_KEY` for the LLM and `MNEMONIC` for the wallet. Everything else — RPC calls, block explorer queries, price feeds — routes through a single proxy endpoint.

**Human:** So the proxy handles `/rpc/ethereum`, `/rpc/base`, `/scan/ethereum`, `/scan/base`, and `/price/eth`?

**Agent:** Right. Express server, three route groups, Docker for deployment. The tool modules don't change their logic — just the URLs they hit. `config/networks.js` points to the proxy instead of Alchemy directly. ethers.js `JsonRpcProvider` doesn't care whether the URL is Alchemy or a proxy — it just sends JSON-RPC.

**Human:** We deployed this on our company server with Docker, set up Caddy reverse proxy for `api.anamwallet.io`, and now the demo URL works with zero client-side key configuration beyond the mnemonic.

**Agent:** And the proxy server itself isn't committed to the repo — it's gitignored. It's an operational concern, not part of the CWP standard. When the hackathon ends, you shut down the proxy. The standard stands on its own.

---

## 7. Multi-turn Conversation — "Continue with full context"

**Human:** The single-turn design is clean for security, but sometimes a user wants to follow up. "What's my balance?" followed by "Send 0.001 ETH to this address."

**Agent:** We can add a Continue button that carries the full conversation history — user messages, assistant messages, tool calls, and tool results — into the next turn. The key question was: should we include tool call results in the history, or just the text?

**Human:** We debated this. Your initial suggestion was to exclude tool results to save tokens. I pushed back — MCP includes full context, and the LLM needs the actual data to avoid hallucinating.

**Agent:** You were right. Without tool results, if the user asks "and on Base too?" the LLM doesn't know the Ethereum balance it just retrieved. It would make up a number. The full history — including every `tool_calls` message and every `tool` response — gets passed to the next turn. OpenAI's API requires this anyway: an assistant message with `tool_calls` must be followed by tool messages for each `tool_call_id`, or it returns a 400 error. We hit this exact bug when implementing Reject → Continue flow and had to add the rejected tool response to the history.

---

## 8. POC vs Production — "Ship what works, document the gap"

**Human:** In our POC, all modules share the same mnemonic and run in the same JS context. That's not the production design — each module should manage its own keys in an isolated sandbox. Should we try to implement full isolation for the hackathon?

**Agent:** No. The hackathon guide says "a working demo of one well-scoped idea beats an ambitious architecture diagram." Ship the POC with shared keys, but document the gap clearly. Show that you understand the production architecture and explain why the POC is structured the way it is.

**Human:** The production design has multiple isolation strategies: separate JS contexts per module, iframe sandboxing for browser environments, scoped storage namespaced by module ID, API injection instead of direct access, even WebAssembly sandboxing. The principle is the same — the Host controls what each module can see and do.

**Agent:** Exactly. The security principles are implemented in the POC: single-module default, riskLevel enforcement, single-turn default. The isolation boundary is the gap — and it's a well-understood engineering problem with proven solutions. The innovation isn't in the sandboxing. It's in the standard interface that makes wallet modules pluggable in the first place.

---

## 9. Chain Agnosticism — "Reference implementations, not the standard"

**Human:** We know the standard supports any chain — if someone builds a Solana or Sui module with a manifest.json, it works. But since our demo only has EVM modules, I'm worried people might think CWP is EVM-only. We should make the distinction clear.

**Agent:** Good instinct. The modules are reference implementations that prove the standard works on real chains. The standard itself is the manifest format plus the runtime interface: `discoverTools()`, `convertToOpenAITools()`, `executeTool()`. Any chain that can be wrapped in a JS module with a `manifest.json` plugs right in. We should label the modules explicitly as "reference implementations" in the docs and add chain support to the comparison table.

**Human:** Same concern for LLM providers. We only support OpenAI right now, but the converter pattern works for any provider.

**Agent:** Exactly. And the same applies to LLM providers. OpenAI is supported now. Adding Claude or Gemini means implementing one `chat()` function — the manifests don't change, the modules don't change. The standard sits between the wallet and the AI, independent of both. We should document the provider support table: OpenAI supported, Claude interface ready, Gemini planned.

---

## 10. Vision — "Search evolved. Wallets will too."

**Human:** I want to communicate something beyond the technical spec. Search used to be about typing keywords. Now it's conversational — you ask what you want and the AI finds the answer. Wallets are at the same inflection point. Instead of learning complex UIs and clicking through multi-step flows, you just tell the agent what you want.

**Agent:** That's a strong opening for the README. Keep it to two sentences — the rest of the document is technical. "Search moved from typing keywords to having conversations. Wallets will follow the same path." Then immediately ground it: "CWP is the standard that makes this possible, securely."

**Human:** But there's a trust problem. When you search, a wrong result is inconvenient. When an agent executes a transaction, a wrong action is irreversible financial loss. That's why the security model isn't optional — it's the whole point.

**Agent:** That's exactly why CWP exists instead of just wrapping wallets in MCP or LangChain tools. The security constraints — riskLevel, single-module default, in-process key isolation — aren't limitations. They're the product. Any framework can call a function. CWP is the standard that makes it safe to do so with someone's money.
