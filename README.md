# Crypto Wallet Plugin (CWP) Standard

A universal interface for AI applications to discover and use crypto wallets as in-process JavaScript modules. Private keys never leave the host process.

Search moved from typing keywords to having conversations. Wallets will follow the same path — no more navigating UIs to swap, bridge, or send. Just tell the agent what you want. CWP is the standard that makes this possible, securely.

This repository contains two things:

1. **The CWP Standard** — manifest schema, runtime interface (discovery, conversion, execution), security model (riskLevel, single-module default, single-turn default)
2. **A Reference Implementation** — a chat-based AI wallet agent that demonstrates the standard with real on-chain execution on Ethereum and Base Sepolia testnets

The chat UI is one possible frontend built on the standard. Any AI application — CLI agent, browser extension, mobile app, multi-agent system — can implement the CWP runtime and use the same wallet modules.

Built for [The Synthesis](https://synthesis.md/) hackathon — **Synthesis Open Track**, **Agents that Pay**, and **Agentic Finance (Uniswap)** tracks.

---

## The Problem

AI agents need to interact with crypto wallets, but every existing approach has a fundamental flaw:

| Approach | Problem |
|----------|---------|
| **MCP (Model Context Protocol)** | Server-based — private keys are transmitted over the network |
| **EIP-1193 / Wallet Standards** | UI popups required — designed for humans, not agents |
| **Framework Tools** (LangChain, CrewAI) | Vendor-locked — not portable across frameworks |

**There is no standard way for an AI agent to use a crypto wallet securely, programmatically, and without framework lock-in.**

---

## The Solution

CWP wallet modules run **inside the host application's JavaScript runtime**. The AI agent imports them as plain JS modules, discovers their capabilities through a manifest, and calls functions directly. No network hop for keys, no UI, no middleware.

```
Inside Host Process
┌──────────────────────────────────────┐
│  AI Agent → CWP Runtime             │
│    ├── ethereum-wallet              │
│    ├── base-wallet                  │
│    └── swap                         │
│         └── Private Key (in-process) │
└──────────────────────────────────────┘
         │ RPC calls only
         ▼
     Blockchain Network
```

**Key insight:** Only RPC calls (read/write blockchain state) cross the network. Private keys stay in-process, used only for local transaction signing.

### Why This Matters

Today, every AI application that needs wallet functionality must build its own integration from scratch. Wallet developers have no standard to target for AI compatibility. The result is fragmentation — N wallet implementations × M AI frameworks, each with custom glue code.

CWP solves the N×M problem: wallet developers build one module following the manifest interface, and it works with any AI application that supports the CWP runtime. AI application developers support the CWP runtime once, and every compliant wallet module works out of the box. The same pattern that USB standardized for hardware peripherals, applied to crypto wallets for AI.

---

## How It Works

```
1. User: "Swap 0.001 ETH to USDC on Base"
2. Agent: Scan manifests → discover tools → send to LLM
3. LLM: Decides tool_call (swap_execute)
4. Runtime: Check riskLevel → high → request user confirmation
5. User: Confirms
6. Tool module: Sign transaction locally → broadcast to blockchain
7. Return result to LLM → generate final response
```

### CWP Lifecycle

```
1. Host loads Wallet Module (JS import)
2. discoverTools() → scan manifest.json files (tool list + schemas + riskLevel)
3. convertToOpenAITools() → register in Tool Registry → expose to LLM
4. LLM decides tool_call based on user request
5. executeTool(name, args) → check riskLevel → execute if low, confirm if high
6. Module runs locally in-process, returns result
7. Result sent to LLM → final response generated
```

---

## Architecture

```
crypto-wallet-standard/
├── tools/                          # CWP wallet modules (the standard)
│   ├── ethereum-wallet/            #   Ethereum Sepolia (L1)
│   │   ├── manifest.json           #     Action schemas + riskLevel
│   │   └── index.js                #     Implementation (ethers.js)
│   ├── base-wallet/                #   Base Sepolia (L2)
│   │   ├── manifest.json
│   │   └── index.js
│   └── swap/                       #   Uniswap V3 swaps
│       ├── manifest.json
│       └── index.js
├── config/                         # Shared configuration
│   ├── networks.js                 #   Chain RPC endpoints (via proxy)
│   └── contracts.js                #   ABIs (ERC20, Uniswap Router/Quoter)
├── utils/
│   └── wallet.js                   #   BIP44 HD wallet derivation
├── src/
│   ├── lib/
│   │   ├── agent/                  # Agent core
│   │   │   ├── discovery.ts        #   Scan tools/*/manifest.json (cached)
│   │   │   ├── converter.ts        #   Manifest → OpenAI function calling format
│   │   │   ├── executor.ts         #   Tool execution + riskLevel check
│   │   │   ├── tool-registry.ts    #   Static tool registry (build-time imports)
│   │   │   ├── index.ts            #   Agent loop (LLM → tool_calls → execute → repeat)
│   │   │   ├── singleton.ts        #   HMR-safe singleton
│   │   │   └── system-prompt.ts    #   Security constraints
│   │   └── providers/              # LLM providers
│   │       ├── openai.ts           #   OpenAI Chat Completions API
│   │       ├── claude.ts           #   Claude (stub, interface ready)
│   │       └── index.ts            #   Provider registry
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.ts       #   POST /api/chat
│   │   │   ├── chat/confirm/route.ts  # POST /api/chat/confirm (high-risk)
│   │   │   ├── modules/route.ts    #   GET /api/modules
│   │   │   └── settings/route.ts   #   GET/POST /api/settings
│   │   ├── page.tsx                #   Main UI
│   │   └── layout.tsx
│   └── components/
│       ├── Chat.tsx                #   Chat with markdown + confirmation flow
│       ├── ModuleSelector.tsx      #   Toggle wallet modules
│       ├── SettingsPanel.tsx       #   Mode selector (Default/Custom URL/Custom AI)
│       ├── StatusBar.tsx           #   Connection indicator
│       └── ToolFlowBar.tsx         #   Collapsible tool execution visualization
└── .env.example
```

---

## Tool Modules

Each module is a self-contained folder with a `manifest.json` (capability declaration) and `index.js` (implementation). Drop a new folder in `tools/` and the agent discovers it automatically.

The modules below are **reference implementations** demonstrating the CWP standard on EVM chains (Ethereum, Base). The standard itself is chain-agnostic — any blockchain (Solana, Sui, Bitcoin, etc.) or protocol can be added as a module as long as it follows the manifest + index.js interface.

### ethereum-wallet (8 actions)

| Action | Risk | Description |
|--------|------|-------------|
| `getAddress` | low | Get wallet address |
| `getBalance` | low | ETH balance query |
| `getTokenBalance` | low | ERC-20 token balance |
| `getOwnedTokens` | low | List all held tokens |
| `getGasPrice` | low | Current gas price |
| `estimateGas` | low | Gas fee estimation |
| `sendETH` | **high** | Transfer ETH (requires confirmation) |
| `getTransactionStatus` | low | Check transaction status |

### base-wallet (9 actions)

Same as ethereum-wallet + `getUSDCBalance`, operating on Base Sepolia L2.

### swap (3 actions)

| Action | Risk | Description |
|--------|------|-------------|
| `quote` | low | Get swap quote across 4 Uniswap V3 fee tiers (0.01%, 0.05%, 0.3%, 1%) |
| `compare` | low | Compare quotes between Ethereum and Base |
| `execute` | **high** | Execute swap on-chain (requires confirmation) |

---

## Risk Level & User Confirmation

Actions that move funds are marked `riskLevel: "high"` in the manifest. When the agent loop encounters a high-risk tool call, it **pauses execution and requests user confirmation** before proceeding.

```json
{
  "name": "sendETH",
  "riskLevel": "high",
  "description": "Send ETH to another address."
}
```

This is enforced at the runtime level — module developers declare the risk, and the CWP runtime respects it. No amount of prompt engineering can bypass it.

---

## Manifest Schema

The manifest is the contract between a wallet module and the CWP runtime. It declares what the module can do in an LLM-neutral format.

```json
{
  "name": "Ethereum Wallet",
  "aiTools": {
    "enabled": true,
    "description": "When and how to use this module",
    "actions": [
      {
        "name": "getBalance",
        "riskLevel": "low",
        "description": "What this action does",
        "input": {
          "type": "object",
          "required": ["address"],
          "properties": {
            "address": { "type": "string", "description": "Wallet address (0x...)" }
          }
        },
        "output": {
          "type": "object",
          "properties": {
            "balance": { "type": "string" },
            "symbol": { "type": "string" }
          }
        }
      }
    ]
  }
}
```

The runtime converter transforms this LLM-neutral manifest into the target LLM's tool-calling format. Module developers write the manifest once — the runtime handles the rest.

### LLM Provider Support

| Provider | Status | What's needed |
|----------|--------|---------------|
| **OpenAI** (GPT-4o) | Supported | — |
| **Anthropic** (Claude) | Interface ready | Add Claude Messages API converter |
| **Google** (Gemini) | Planned | Add Gemini function declaration converter |
| Others | Planned | Implement the provider interface (`chat()` method) |

Currently, the Custom AI mode supports OpenAI only. Adding a new LLM provider requires implementing a single `chat()` function that maps our internal format to the provider's API — the manifest and tool modules remain unchanged.

---

## Security Design

### Default Security Posture

CWP is designed with a **secure-by-default, opt-out-with-consent** model. The strictest security posture is the default. Users may relax constraints through explicit action — and each relaxation is a conscious choice, not an implicit behavior.

| Principle | Default Behavior | User May Opt Out |
|-----------|-----------------|------------------|
| **Single-Module Session** | One module active per session — limits blast radius of any single module | User may select multiple modules simultaneously via the module selector |
| **Single-Turn Conversation** | Each message is independent — prevents context poisoning across turns | User may click "Continue" to carry context forward |
| **Risk Level Enforcement** | High-risk actions (sendETH, swap execute) always pause for confirmation | Cannot be bypassed — this is non-negotiable |
| **In-Process Key Isolation** | Private keys never leave the JS runtime | Cannot be bypassed — architectural guarantee |
| **One-Way Calls** | Modules return data to the runtime; they cannot invoke the LLM or other modules directly | Cannot be bypassed — architectural guarantee |

The key insight: **security relaxation is always initiated by the user, never by the module or the LLM.** A malicious module cannot request multi-module access. A prompt injection cannot trigger "Continue" to accumulate context. High-risk confirmation cannot be skipped regardless of how the request is framed.

### How This Mitigates Common AI-Tool Threats

| Threat | How CWP Addresses It |
|--------|---------------------|
| **Goal Hijacking** (malicious prompt injection) | Single-module default limits blast radius; high-risk actions always require human confirmation |
| **Tool Misuse** (repeated dangerous calls) | Agent loop capped at 20 iterations; high-risk tools pause every time |
| **Privilege Escalation** (cross-module key access) | Modules share a wallet but cannot invoke each other; single-module default prevents cross-module interaction |
| **Supply Chain** (malicious module) | Module isolation by default; user must explicitly enable each module |
| **Context Poisoning** (accumulated malicious context) | Single-turn default prevents cross-turn poisoning; Continue is opt-in |
| **Data Exfiltration** (keys sent to external API) | Architectural guarantee — keys are used for in-process signing only, never passed to LLM or any API |

---

## Comparison with Existing Approaches

|  | MCP | EIP-1193 | Framework Tools | **CWP (This Project)** |
|--|-----|---------|----------------|----------------------|
| Key exposure | Over network | In-browser | Varies | **In-process only** |
| UI requirement | None | Popup required | None | **None** |
| Framework lock-in | None | Browser | LangChain/CrewAI | **None** |
| AI-native | No | No | Yes | **Yes** |
| Risk control | None | Per-tx approval | None | **Manifest riskLevel** |
| Module discovery | Server config | window.ethereum | Framework config | **Auto-scan manifest** |
| Chain support | Provider-dependent | EVM only | Framework-dependent | **Any chain (EVM, Solana, Sui, ...)** |

---

## Getting Started

### Prerequisites

- Node.js 20+
- BIP39 mnemonic (for testnet wallet)
- OpenAI API key

### Install & Run

```bash
git clone https://github.com/anam-145/crypto-wallet-standard.git
cd crypto-wallet-standard
npm install
```

Create `.env.local`:

```
OPENAI_API_KEY=your-openai-api-key
MNEMONIC=your-twelve-word-mnemonic-phrase
```

```bash
npm run dev
```

Open `http://localhost:3000`, select modules, and start chatting.

### Operating Modes

| Mode | How it works | Config |
|------|-------------|--------|
| **Default** | Uses OpenAI via server-side API key | `OPENAI_API_KEY` in `.env.local` |
| **Custom URL** | Proxies to your own backend | Enter URL in settings panel |
| **Custom AI** | Direct OpenAI call with user-provided key | Enter API key in settings panel |

---

## Adding a New Wallet Module

1. Create `tools/your-module/manifest.json` with action schemas and riskLevel
2. Create `tools/your-module/index.js` with a default-exported class
3. Register the module in `src/lib/agent/tool-registry.ts` (one import + one registry entry)
4. Restart the app — the agent discovers it automatically

The manifest and runtime interface are standardized. In a production CWP runtime with dynamic module loading, step 3 would be unnecessary — modules would be fully plug-and-play.

---

## Tech Stack

- **Next.js 16** / TypeScript / React 19 / Tailwind CSS 4
- **ethers.js 5** — blockchain interactions, BIP44 wallet derivation
- **Uniswap V3** — SwapRouter02 + QuoterV2 (Sepolia + Base Sepolia)
- **OpenAI API** — GPT-4o with function calling
- **Alchemy** — RPC provider (via proxy server)

---

## POC vs Production Design

This repository is a **proof-of-concept** demonstrating the CWP standard. The production design differs in key areas related to module isolation and key management.

| Aspect | Current POC | Production CWP Standard |
|--------|-------------|------------------------|
| **Key management** | Shared mnemonic in `utils/wallet.js` — all modules derive keys from the same seed | Each module manages its own keys internally; Host never accesses private keys |
| **Module isolation** | All modules run in the same JS context, sharing process memory | Each module runs in an isolated execution context with only permitted APIs injected |
| **Cross-module access** | Technically possible (same process, shared imports) | Blocked — modules cannot read each other's memory, keys, or state |
| **Host role** | Host loads modules and manages keys centrally | Host only orchestrates module lifecycle and enforces security policy; keys are fully encapsulated inside each module |
| **Configuration** | Shared `config/` directory for network endpoints and ABIs | Each module bundles its own configuration — fully self-contained and portable |

### Why the POC is structured this way

The shared-key approach was chosen for development speed during the hackathon build period. It lets us demonstrate the full CWP lifecycle — manifest discovery, LLM tool conversion, risk-level confirmation, and on-chain execution — without the complexity of per-module isolation.

The security principles (single-module default, single-turn default, riskLevel enforcement) are fully implemented and enforced in this POC. The isolation boundary is the remaining gap between POC and production.

### Production isolation approaches

Module isolation is a well-understood problem with multiple proven strategies. The production CWP runtime can adopt any combination depending on the host environment:

- **Separate JS context per module** — each module receives its own V8 isolate or JS engine instance, preventing cross-module memory access
- **iframe-based isolation** — in browser environments, each module runs in a sandboxed iframe with `postMessage` as the only communication channel
- **Scoped storage** — each module's persistent data (keys, state, cache) is namespaced by module ID, accessed only through Host-provided APIs
- **API injection** — instead of giving modules direct access to `window`, `fs`, or `process`, the Host injects a restricted API surface (similar to how browser extensions receive only `chrome.*` APIs)
- **WebAssembly modules** — modules compiled to Wasm run in a memory-safe sandbox with no access to host memory

The key principle: **the Host controls what each module can see and do.** Modules are tenants, not owners.

---

## License

MIT
