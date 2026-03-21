# AGENTS.md — Crypto Wallet Plugin (CWP)

## What This Project Is

This repository contains two things:

1. **The CWP Standard** — a universal interface specification for AI applications to discover and use crypto wallets as in-process JS modules. Defines the manifest schema, runtime interface (`discoverTools`, `convertToOpenAITools`, `executeTool`), and security model (`riskLevel`, single-module default, single-turn default).

2. **A Reference Implementation** — a chat-based AI wallet agent demonstrating the standard with real on-chain execution. The chat UI is one possible frontend; any AI application (CLI, browser extension, multi-agent system) can implement the CWP runtime and use the same wallet modules.

Private keys never leave the host process. Modules are auto-discovered via manifest files and converted to any LLM's function-calling format at runtime.

## Problem

No standard exists for AI agents to programmatically discover and invoke crypto wallet functions.

- **MCP**: Server-based — private keys transmitted over the network between client and server
- **EIP-1193 / WalletConnect**: UI popups required — incompatible with AI automation
- **LangChain / CrewAI tools**: Vendor-locked — not portable across frameworks

## How It Works

1. Host loads wallet modules via JS import from `tools/` directory
2. `discoverTools()` scans `tools/*/manifest.json` — returns tool list, schemas, and riskLevel (result is cached)
3. `convertToOpenAITools()` transforms manifests into LLM function-calling format
4. LLM decides `tool_calls` based on user request
5. `executeTool(name, args)` checks riskLevel — executes immediately if `low`, requests user confirmation if `high`
6. Module executes locally in-process, returns result to agent loop
7. Agent loop repeats steps 4-6 until LLM returns final response (max 20 iterations)

## Available Tools

The following are reference implementations on EVM testnets. CWP is chain-agnostic — any chain (Solana, Sui, Bitcoin, etc.) can be added as a module following the same manifest interface.

### ethereum-wallet (Ethereum Sepolia L1)

- `getAddress()` → wallet address [low]
- `getBalance(address)` → ETH balance [low]
- `getTokenBalance(address, tokenAddress)` → ERC-20 token balance [low]
- `getOwnedTokens(address)` → list held tokens [low]
- `getGasPrice()` → current gas price [low]
- `estimateGas(from, to, amount)` → gas fee estimation [low]
- `sendETH(to, amount)` → transfer ETH [high, confirmation required]
- `getTransactionStatus(txHash)` → transaction status [low]

### base-wallet (Base Sepolia L2)

Same as ethereum-wallet + `getUSDCBalance(address)` [low]

### swap (Uniswap V3, both chains)

- `quote(chain, tokenIn, tokenOut, amount)` → swap quote across 4 fee tiers [low]
- `compare(tokenIn, tokenOut, amount)` → cross-chain quote comparison [low]
- `execute(chain, tokenIn, tokenOut, amountIn, slippage)` → execute swap on-chain [high, confirmation required]

## Manifest Format

Each module declares its capabilities in `manifest.json`. The format is LLM-neutral — the runtime converter transforms it to OpenAI, Claude, or any other format.

```json
{
  "name": "Module Name",
  "aiTools": {
    "enabled": true,
    "description": "When to use this module",
    "actions": [
      {
        "name": "actionName",
        "riskLevel": "low",
        "description": "What this action does",
        "input": { "type": "object", "required": [], "properties": {} },
        "output": { "type": "object", "properties": {} }
      }
    ]
  }
}
```

## LLM Provider Support

The manifest format is LLM-neutral. The runtime converter transforms it into the target provider's format. Currently OpenAI (GPT-4o) is supported. Adding a new provider (Claude, Gemini, etc.) requires implementing a single `chat()` function — manifests and tool modules remain unchanged.

## Security Model

CWP uses a **secure-by-default, opt-out-with-consent** design.

### Defaults (strictest posture)

- **Single-module session**: One module active at a time, limiting the blast radius of any module
- **Single-turn conversation**: Each message is independent, preventing context poisoning across turns
- **Risk level enforcement**: `riskLevel: "high"` actions always pause for user confirmation — non-negotiable
- **In-process key isolation**: Private keys are used for local signing only, never sent to LLM or any API — architectural guarantee
- **One-way calls**: Modules return data to the runtime; they cannot invoke the LLM or other modules

### User-initiated relaxation

- User may select **multiple modules** via the UI module selector
- User may click **Continue** to carry conversation context into the next turn
- Both are explicit user actions — cannot be triggered by modules, prompts, or the LLM

### What cannot be bypassed

- High-risk confirmation (always required for sendETH, swap execute)
- In-process key isolation (architectural — keys never appear in any API payload)
- Agent loop iteration limit (max 20)

## POC vs Production

This repository is a proof-of-concept. Key differences from the production CWP standard:

- **POC**: Shared mnemonic — all modules derive keys from the same seed via `utils/wallet.js`
- **Production**: Each module manages its own keys internally; Host never accesses private keys
- **POC**: Modules share the same JS context and process memory
- **Production**: Each module runs in an isolated execution context (separate JS instance, iframe sandbox, scoped storage, or Wasm); cross-module access is blocked by the Host

The security principles (single-module default, riskLevel enforcement, single-turn default) are implemented in this POC. Module-level isolation is the remaining gap — it is a well-understood problem with multiple proven approaches.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/modules` | List discovered tool modules |
| POST | `/api/chat` | Send message through agent loop |
| POST | `/api/chat/confirm` | Confirm a paused high-risk tool call |
| GET | `/api/settings` | Current mode and providers |
| POST | `/api/settings` | Change operating mode |

## Run

```bash
git clone https://github.com/anam-145/crypto-wallet-standard.git
cd crypto-wallet-standard
npm install
# Set OPENAI_API_KEY and MNEMONIC in .env.local
npm run dev
# Open http://localhost:3000
```

## Adding a Module

Create a folder in `tools/` with `manifest.json` + `index.js`. The agent discovers it automatically on next request. No changes to agent core, API routes, or frontend required.

## Tech Stack

Next.js 16, TypeScript, React 19, ethers.js 5, Uniswap V3 (SwapRouter02 + QuoterV2), OpenAI GPT-4o, Alchemy RPC, Sepolia + Base Sepolia testnets

## Hackathon

The Synthesis — **Synthesis Open Track**, **Agents that Pay**, and **Agentic Finance (Uniswap)** tracks. ERC-8004 on-chain identity registered on Base Mainnet.
