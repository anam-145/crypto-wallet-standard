# Crypto Wallet Plugin (CWP) Standard

A universal interface for AI applications to discover and use crypto wallets as in-process JavaScript modules.

## Why

AI agents need to use crypto wallets, but current options are broken:

- **MCP** sends private keys over the network
- **Wallet standards** (EIP-1193, Wallet Standard) require UI popups designed for humans
- **Framework tools** (LangChain, CrewAI) are vendor-locked and non-portable

## How CWP Works

Wallet plugins are plain JS modules that run **inside the host application's runtime**. Private keys never cross process boundaries. No server, no UI, no middleware.

```
AI App (host process)
 └── CWP Runtime
      ├── Wallet Plugin A  (in-process JS module)
      └── Wallet Plugin B  (in-process JS module)
```

## Key Properties

- **In-process** — wallet logic runs in the same JS runtime as the AI app
- **Key isolation** — private keys never leave the process boundary
- **Universal** — works with any AI framework, any wallet, any chain
- **Zero UI** — no popups, no approval dialogs, fully programmatic

## Status

Early development. Built for [The Synthesis](https://synthesis.md/) hackathon.

## License

MIT
