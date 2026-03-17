/**
 * Network Configuration
 * 2 Chains: Ethereum, Base (All Testnet)
 */

const ALCHEMY_KEY = process.env.ALCHEMY_API_KEY || '';
const ALCHEMY_BASE_KEY = process.env.ALCHEMY_BASE_API_KEY || '';

export const networks = {
  // Ethereum Sepolia (L1 Testnet)
  ethereum: {
    name: 'Ethereum Sepolia',
    chainId: 11155111,
    rpcUrl: `https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    contracts: {
      uniswapRouter: '0x3bFA4769FB09eefC5a80d6E87c3B9C650f7Ae48E',
      uniswapQuoter: '0xEd1f6473345F45b75F8179591dd5bA1888cf2FB3',
      weth: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
      usdc: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238'
    }
  },

  // Base Sepolia (L2 Testnet)
  base: {
    name: 'Base Sepolia',
    chainId: 84532,
    rpcUrl: `https://base-sepolia.g.alchemy.com/v2/${ALCHEMY_BASE_KEY}`,
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
    contracts: {
      uniswapRouter: '0x050E797f3625EC8785265e1d9BDd4799b97528A1',
      uniswapQuoter: '0xC5290058841028F1614F3A6F0F5816cAd0df5E27',
      weth: '0x4200000000000000000000000000000000000006',
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e'
    }
  }
};

export function getNetwork(chainName) {
  return networks[chainName] || null;
}

export default { networks, getNetwork };
