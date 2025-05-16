import { BrowserProvider, Contract } from 'ethers';
import LendingProtocolABI from '../abi/LendingProtocol.json';
import erc20ABI from '../abi/erc20.json';

const getProvider = () => {
  return new BrowserProvider(window.ethereum);
};

export const getSigner = async () => {
  const provider = getProvider();
  return await provider.getSigner();
};

const contractAddress = process.env.REACT_APP_CONTRACT_ADDRESS;
const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;

export const getContract = async () => {
  const signer = await getSigner();
  return new Contract(contractAddress, LendingProtocolABI, signer);
};
export const getTokenContract = async () => {
  const signer = await getSigner();
  return new Contract(tokenAddress, erc20ABI, signer);
};
