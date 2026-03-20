/**
 * Ethereum Wallet Tool
 * Chain: Ethereum Sepolia (Testnet)
 */

import { ethers } from 'ethers';
import axios from 'axios';
import { getNetwork } from '../../config/networks.js';
import { ERC20_ABI } from '../../config/contracts.js';
import { deriveEthereumWallet } from '../../utils/wallet.js';

class EthereumWallet {
  constructor() {
    this.network = getNetwork('ethereum');
    this.provider = new ethers.providers.JsonRpcProvider(this.network.rpcUrl);
  }

  async getAddress() {
    const mnemonic = process.env.MNEMONIC;
    if (!mnemonic) throw new Error('MNEMONIC not set');
    const wallet = deriveEthereumWallet(mnemonic);
    return { address: wallet.address, chain: 'ethereum' };
  }

  async getBalance(address) {
    const balanceWei = await this.provider.getBalance(address);
    return {
      balance: ethers.utils.formatEther(balanceWei),
      balanceWei: balanceWei.toString(),
      symbol: 'ETH',
      chain: 'ethereum'
    };
  }

  async getTokenBalance(address, tokenAddress) {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
    const [balance, decimals, symbol] = await Promise.all([
      contract.balanceOf(address),
      contract.decimals(),
      contract.symbol()
    ]);

    return {
      balance: ethers.utils.formatUnits(balance, decimals),
      symbol,
      decimals,
      chain: 'ethereum'
    };
  }

  async getOwnedTokens(address, maxTokens = 50) {
    try {
      const url = `${this.network.scanUrl}?module=account&action=tokentx&address=${address}&startblock=0&endblock=99999999&sort=desc`;
      const response = await axios.get(url);
      const data = response.data;

      if (data.status !== '1' || !data.result) return { tokens: [], count: 0 };

      const tokenMap = new Map();
      for (const tx of data.result) {
        if (!tokenMap.has(tx.contractAddress)) {
          tokenMap.set(tx.contractAddress, {
            tokenAddress: tx.contractAddress,
            symbol: tx.tokenSymbol,
            decimals: parseInt(tx.tokenDecimal) || 18
          });
          if (tokenMap.size >= maxTokens) break;
        }
      }

      const tokens = [];
      for (const [tokenAddress, tokenInfo] of tokenMap) {
        try {
          const contract = new ethers.Contract(tokenAddress, ERC20_ABI, this.provider);
          const balance = await contract.balanceOf(address);
          if (!balance.isZero()) {
            tokens.push({
              ...tokenInfo,
              balance: ethers.utils.formatUnits(balance, tokenInfo.decimals)
            });
          }
        } catch (error) {
          console.warn(`[EthereumWallet] Token balance check failed: ${tokenAddress}`, error.message);
        }
      }

      return { tokens, count: tokens.length };
    } catch (error) {
      return { tokens: [], count: 0, error: error.message };
    }
  }

  async getGasPrice() {
    const gasPrice = await this.provider.getGasPrice();
    return {
      gasPrice: gasPrice.toString(),
      gasPriceGwei: ethers.utils.formatUnits(gasPrice, 'gwei'),
      chain: 'ethereum'
    };
  }

  async estimateGas(from, to, amount) {
    const gasLimit = await this.provider.estimateGas({
      from,
      to,
      value: ethers.utils.parseEther(amount)
    });
    const gasPrice = await this.provider.getGasPrice();
    const gasFee = gasLimit.mul(gasPrice);

    return {
      gasLimit: gasLimit.toString(),
      gasFee: ethers.utils.formatEther(gasFee),
      chain: 'ethereum'
    };
  }

  async getTransactionStatus(txHash) {
    const receipt = await this.provider.getTransactionReceipt(txHash);
    if (!receipt) return { status: 'pending', confirmations: 0 };

    const currentBlock = await this.provider.getBlockNumber();
    return {
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      confirmations: currentBlock - receipt.blockNumber,
      chain: 'ethereum'
    };
  }
}

export default new EthereumWallet();
