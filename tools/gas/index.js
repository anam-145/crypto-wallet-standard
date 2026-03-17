/**
 * Gas Tool - Multi-chain Gas Price & Comparison
 */

import { ethers } from 'ethers';
import axios from 'axios';
import { getNetwork } from '../../config/networks.js';

class GasTool {
  constructor() {
    this.ethereumNetwork = getNetwork('ethereum');
    this.baseNetwork = getNetwork('base');

    this.ethereumProvider = new ethers.providers.JsonRpcProvider(this.ethereumNetwork.rpcUrl);
    this.baseProvider = new ethers.providers.JsonRpcProvider(this.baseNetwork.rpcUrl);

    this.priceCache = { eth: null, timestamp: 0 };
  }

  async getEthPrice() {
    const now = Date.now();
    if (this.priceCache.eth && (now - this.priceCache.timestamp) < 300000) {
      return this.priceCache.eth;
    }

    try {
      const response = await axios.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd',
        { timeout: 5000 }
      );
      const price = response.data.ethereum.usd;
      this.priceCache = { eth: price, timestamp: now };
      return price;
    } catch (error) {
      console.warn(`[Gas] ETH price fetch failed, using fallback:`, error.message);
      return this.priceCache.eth || 2000;
    }
  }

  async getAllGasPrices() {
    const [ethereum, base] = await Promise.all([
      this.getChainGas('ethereum'),
      this.getChainGas('base')
    ]);

    return { ethereum, base, timestamp: new Date().toISOString() };
  }

  async getChainGas(chain) {
    const provider = chain === 'ethereum' ? this.ethereumProvider : this.baseProvider;
    const feeData = await provider.getFeeData();
    const ethPrice = await this.getEthPrice();

    const gasPrice = feeData.gasPrice;
    const gasPriceGwei = parseFloat(ethers.utils.formatUnits(gasPrice, 'gwei'));

    const transferFee = gasPrice.mul(21000);
    const swapFee = gasPrice.mul(150000);

    return {
      chain,
      gasPriceGwei: gasPriceGwei.toFixed(6),
      ethPriceUSD: ethPrice,
      estimates: {
        transfer: {
          eth: ethers.utils.formatEther(transferFee),
          usd: (parseFloat(ethers.utils.formatEther(transferFee)) * ethPrice).toFixed(4)
        },
        swap: {
          eth: ethers.utils.formatEther(swapFee),
          usd: (parseFloat(ethers.utils.formatEther(swapFee)) * ethPrice).toFixed(4)
        }
      }
    };
  }

  async compareGas(operation = 'transfer') {
    const [ethereumGas, baseGas] = await Promise.all([
      this.getChainGas('ethereum'),
      this.getChainGas('base')
    ]);

    const ethCost = parseFloat(ethereumGas.estimates[operation]?.eth || '0');
    const baseCost = parseFloat(baseGas.estimates[operation]?.eth || '0');
    const savingsNum = ethCost > 0 ? (ethCost - baseCost) / ethCost * 100 : 0;
    const cheaperChain = baseCost < ethCost ? 'base' : 'ethereum';
    const savingsAbs = Math.abs(savingsNum).toFixed(2);

    return {
      operation,
      ethereum: ethereumGas.estimates[operation],
      base: baseGas.estimates[operation],
      comparison: {
        cheaperChain,
        savingsPercent: `${savingsAbs}%`,
        recommendation: `Use ${cheaperChain === 'base' ? 'Base' : 'Ethereum'} to save ${savingsAbs}% on gas`
      }
    };
  }

  async recommendChain(operation = 'transfer', amount = '1') {
    const comparison = await this.compareGas(operation);

    return {
      ...comparison,
      recommendation: {
        chain: comparison.comparison.cheaperChain,
        reason: comparison.comparison.recommendation
      }
    };
  }
}

export default new GasTool();
