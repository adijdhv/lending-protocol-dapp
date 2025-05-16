import React, { useState, useEffect } from "react";
import { getContract,getTokenContract } from "../utils/contract";
import { formatEther, parseEther, parseUnits } from "ethers";

const Interface = () => {
  const [collateral, setCollateral] = useState("");
  const [borrowAmount, setBorrowAmount] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState("");
  const [txHistory, setTxHistory] = useState([]);
  const [maxBorrowed, setMaxBorrowed] = useState(0);
  const [collateralAmount, setCollateralAmount] = useState(0);
  const [borrowedAmount, setBorrowedAmount] = useState(0);
     const borrowedAmountinEth = parseFloat(formatEther(borrowedAmount)).toFixed(4);

   const collateralAmountinEth = parseFloat(formatEther(collateralAmount)).toFixed(4);
 const [healthFactor, setHealthFactor] = useState({ 
  value: null, 
  status: 'loading' 
});
  const [loading, setLoading] = useState({
    deposit: false,
    borrow: false,
    repay: false,
    withdraw: false
  });

  // Check if wallet is connected on component mount
  useEffect(() => {
    const checkWalletConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setIsConnected(true);
            setAccount(accounts[0]);
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
        }
      }
    };
    

    checkWalletConnection();

    
    
     const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        setIsConnected(false);
        setAccount("");
      } else {
        setAccount(accounts[0]);
      }
    };

    window.ethereum?.on('accountsChanged', handleAccountsChanged);

    return () => {
      window.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  useEffect(() => {
    const fetchMaxBorrowedAmount = async () => {
      if (isConnected && account) {
        const contract = await getContract(account);
        const maxBorrowedAmount = await contract.getMaxBorrowAmount(account);
        console.log("Max Borrowed Amount from contract:", maxBorrowedAmount.toString());
        setMaxBorrowed(maxBorrowedAmount.toString());
        console.log("Max Borrowed Amount:", maxBorrowed);
      }
    };
    fetchMaxBorrowedAmount();
  }, [isConnected, account]);
 
  useEffect(() => {
    const fetchCollateralAmount = async () => {
      if (isConnected && account) {
        const contract = await getContract(account);
        const {collateralAmount} = await contract.userAccounts(account);
        console.log("Collateral Amount from contract:", collateralAmount.toString());
        setCollateralAmount(collateralAmount.toString());
        console.log("Collateral Amount:", collateralAmount);
      }
    };
    fetchCollateralAmount();
    }, [isConnected, account]);

  useEffect(() => {
    const fetchBorrowedAmount = async () => {
      if (isConnected && account) {
        const contract = await getContract(account);
        const {borrowedAmount} = await contract.userAccounts(account);
        console.log("Borrowed Amount from contract:", borrowedAmount.toString());
        setBorrowedAmount(borrowedAmount.toString());
        console.log("Borrowed Amount:", borrowedAmount);
      }
      };
    fetchBorrowedAmount();
    }, [isConnected, account]);

   useEffect(() => {
  const checkHealthStatus = async () => {
    if (isConnected && account) {
      try {
        const contract = await getContract(account);
        const healthFactorValue = await contract.getHealthFactor(account);
        console.log("Health Factor from contract:", healthFactorValue.toString());
        
        // Handle the special case when there's no debt (max uint256 value)
        if (healthFactorValue.toString() === '115792089237316195423570985008687907853269984665640564039457584007913129639935') {
          setHealthFactor({ value: '∞', status: 'safe' });
          return;
        }
        
        // Convert BigNumber to number (be careful with very large numbers)
        const hfNumber = parseFloat(healthFactorValue.toString()) / 10000;
        
        // Determine status (assuming liquidation threshold is 10000)
        const status = hfNumber > 1 ? 'safe' : 'not safe';
        
        setHealthFactor({ 
          value: hfNumber.toFixed(2), 
          status: status 
        });
        
      } catch (error) {
        console.error("Error fetching health factor:", error);
        setHealthFactor({ value: 'Error', status: 'error' });
      }
    }
  };
  
  checkHealthStatus();
}, [isConnected, account]);


 


  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setIsConnected(true);
        setAccount(accounts[0]);
        const contract = await getContract(accounts[0]);
        

        console.log("Contract instance:", contract);
      } catch (error) {
        console.error("Error connecting wallet:", error);
        showNotification("Error connecting wallet", "error");
      }
    } else {
      showNotification("Please install MetaMask!", "error");
    }
  };

  const disconnectWallet = () => {
    setIsConnected(false);
    setAccount("");
  };

  const addTransaction = (type, hash, amount) => {
    const newTx = {
      type,
      hash,
      amount,
      timestamp: new Date().toLocaleString()
    };
    setTxHistory([newTx, ...txHistory]);
  };

  const showNotification = (message, type = "success") => {
     alert(message);
  };

  const handleDeposit = async () => {
    if (!isConnected) {
      showNotification("Please connect your wallet first", "error");
      return;
    }
    if (!collateral || parseFloat(collateral) <= 0) {
      showNotification("Please enter a valid amount", "error");
      return;
    }
    
    setLoading({...loading, deposit: true});
    try {
      const contract = await getContract();
      const value = parseEther(collateral); // ETH value
      console.log("Depositing:", value.toString());
      const tx = await contract.deposit({ value });
      const receipt = await tx.wait();
      addTransaction("Deposit", receipt.hash, collateral + " ETH");
      showNotification("Deposit successful");
      setCollateral("");
    } catch (error) {
      console.error("Deposit failed:", error);
      showNotification("Deposit failed: " + (error.reason || error.message), "error");
    } finally {
      setLoading({...loading, deposit: false});
    }
  };

  const handleBorrow = async () => {
    if (!isConnected) {
      showNotification("Please connect your wallet first", "error");
      return;
    }
    if (!borrowAmount || parseFloat(borrowAmount) <= 0) {
      showNotification("Please enter a valid amount", "error");
      return;
    }
    
    setLoading({...loading, borrow: true});
    try {
      const contract = await getContract();
      const amount = parseUnits(borrowAmount, 18);  
      console.log("Borrowing:", amount.toString());
      const tx = await contract.borrow(amount);
      const receipt = await tx.wait();
      addTransaction("Borrow", receipt.hash, borrowAmount + " TestTokens");
      showNotification("Borrow successful");
      setBorrowAmount("");
    } catch (error) {
      console.error("Borrow failed:", error);
      showNotification("Borrow failed: " + (error.reason || error.message), "error");
    } finally {
      setLoading({...loading, borrow: false});
    }
  };

  const handleRepay = async () => {
  if (!isConnected || !account) {
    showNotification("Please connect your wallet first", "error");
    return;
  }
  
  if (!repayAmount || parseFloat(repayAmount) <= 0) {
    showNotification("Please enter a valid amount", "error");
    return;
  }
  
  setLoading({...loading, repay: true});
  
  try {
    // 1. Get contracts with proper error handling
    const contract = await getContract();
    if (!contract) throw new Error("Lending contract not initialized");
    
    const tokenContract = await getTokenContract();
    if (!tokenContract) throw new Error("Token contract not initialized");

    // 2. Convert amount to proper units (wei)
    const amount =  parseUnits(repayAmount, 18); // Assuming 18 decimals
    console.log("Repaying:", amount.toString());
    
    // 3. Verify contract addresses
    console.log("Token Contract Address:", process.env.REACT_APP_TOKEN_ADDRESS);
    console.log("Lending Contract Address:",process.env.REACT_APP_CONTRACT_ADDRESS );
    
    // 4. Check token balance
    const balance = await tokenContract.balanceOf(account);
    console.log("Token Balance:", balance.toString());

   
      console.log("Approving testTokens...");
      const approveTx = await tokenContract.approve(process.env.REACT_APP_CONTRACT_ADDRESS, amount);
      await approveTx.wait();
      console.log("Approved Test for repayment");
    
    
    // 7. Execute repay with the amount parameter
    showNotification("Processing repayment...", "info");
    const tx = await contract.repay(amount); // Make sure to pass the amount
    const receipt = await tx.wait();
    
    // 8. Handle successful repayment
    addTransaction("Repay", receipt.hash, repayAmount + " TestTokens");
    showNotification("Repay successful", "success");
    setRepayAmount("");
    
    // 9. Refresh data
    await refreshBorrowedAmount(); // Implement this function to update UI
    
  } catch (error) {
    console.error("Full error details:", error);
    
    let errorMessage = error.reason || error.message;
    if (error.code === 4001) {
      errorMessage = "Transaction rejected by user";
    } else if (errorMessage.includes("insufficient allowance")) {
      errorMessage = "Insufficient token allowance";
    } else if (errorMessage.includes("insufficient funds")) {
      errorMessage = "Insufficient token balance";
    } else if (errorMessage.includes("missing revert data")) {
      errorMessage = "Contract interaction failed - check approval";
    }
    
    showNotification(`Repay failed: ${errorMessage}`, "error");
  } finally {
    setLoading({...loading, repay: false});
  }
};

// Example refresh function
const refreshBorrowedAmount = async () => {
  try {
    const contract = await getContract();
    const userAccount = await contract.userAccounts(account);
    setBorrowedAmount(parseUnits(userAccount.borrowedAmount, 18));
  } catch (error) {
    console.error("Error refreshing borrowed amount:", error);
  }
};

  const handleWithdraw = async () => {
    if (!isConnected) {
      showNotification("Please connect your wallet first", "error");
      return;
    }
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) {
      showNotification("Please enter a valid amount", "error");
      return;
    }
    
    setLoading({...loading, withdraw: true});
    try {
      const contract = await getContract();
      const amount = parseEther(withdrawAmount);  // convert ETH string to wei (BigNumber)
      const tx = await contract.withdraw(amount);
      const receipt = await tx.wait();
      addTransaction("Withdraw", receipt.hash, withdrawAmount + " ETH");
      showNotification("Withdraw successful");
      setWithdrawAmount(""); 
    } catch (error) {
      console.error("Withdraw failed:", error);
      showNotification("Withdraw failed: " + (error.reason || error.message), "error");
    } finally {
      setLoading({...loading, withdraw: false});
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header with wallet connection */}
      <header className="bg-gray-800 shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:px-6 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-100">DeFi Lending Protocol</h1>
          <div>
            {isConnected ? (
              <div className="flex items-center space-x-3">
                <span className="bg-gray-700 text-gray-100 px-3 py-1 rounded-full text-sm font-medium">
                  {`${account.substring(0, 6)}...${account.substring(account.length - 4)}`}
                </span>
                <button 
                  onClick={disconnectWallet}
                  className="px-3 py-1 border border-gray-600 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button 
                onClick={connectWallet}
                className="flex items-center px-3 py-1 bg-gray-700 text-gray-100 rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Actions column - Stack all modals vertically */}
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-700 text-gray-100">
                <h2 className="text-base font-semibold">Deposit Collateral</h2>
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount in ETH
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={collateral}
                      onChange={(e) => setCollateral(e.target.value)}
                      className="flex-1 block w-full rounded-l-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                    />
                    <span className="inline-flex items-center px-3 py-1 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md">
                      ETH
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleDeposit}
                  disabled={loading.deposit || !isConnected}
                  className={`w-full py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading.deposit || !isConnected ? "bg-gray-400" : "bg-gray-700 hover:bg-gray-800"} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                >
                  {loading.deposit ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Deposit"
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-700 text-gray-100">
                <h2 className="text-base font-semibold">Borrow TestTokens</h2>
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to Borrow
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={borrowAmount}
                      onChange={(e) => setBorrowAmount(e.target.value)}
                      className="flex-1 block w-full rounded-l-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                    />
                    <span className="inline-flex items-center px-3 py-1 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md">
                      TestTokens
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleBorrow}
                  disabled={loading.borrow || !isConnected}
                  className={`w-full py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading.borrow || !isConnected ? "bg-gray-400" : "bg-gray-700 hover:bg-gray-800"} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                >
                  {loading.borrow ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Borrow"
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-700 text-gray-100">
                <h2 className="text-base font-semibold">Repay Loan</h2>
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to Repay
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={repayAmount}
                      onChange={(e) => setRepayAmount(e.target.value)}
                      className="flex-1 block w-full rounded-l-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                    />
                    <span className="inline-flex items-center px-3 py-1 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md">
                      TestTokens
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleRepay}
                  disabled={loading.repay || !isConnected}
                  className={`w-full py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading.repay || !isConnected ? "bg-gray-400" : "bg-gray-700 hover:bg-gray-800"} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                >
                  {loading.repay ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Repay"
                  )}
                </button>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-gray-700 text-gray-100">
                <h2 className="text-base font-semibold">Withdraw Collateral</h2>
              </div>
              <div className="p-4">
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount to Withdraw
                  </label>
                  <div className="flex">
                    <input
                      type="number"
                      step="0.001"
                      placeholder="0.0"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      className="flex-1 block w-full rounded-l-md border-gray-300 shadow-sm focus:border-gray-500 focus:ring-gray-500 sm:text-sm"
                    />
                    <span className="inline-flex items-center px-3 py-1 border border-l-0 border-gray-300 bg-gray-50 text-gray-500 rounded-r-md">
                      ETH
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleWithdraw}
                  disabled={loading.withdraw || !isConnected}
                  className={`w-full py-2 px-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${loading.withdraw || !isConnected ? "bg-gray-400" : "bg-gray-700 hover:bg-gray-800"} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                >
                  {loading.withdraw ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    "Withdraw"
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Transaction History - Now takes 1/3 of the width on desktop */}
          <div className="md:col-span-1">
            <div className="bg-white shadow rounded-lg overflow-hidden sticky top-4">
              <div className="px-4 py-2 bg-gray-800 text-white">
                <h2 className="text-base font-semibold">Transaction History</h2>
              </div>
              
              {txHistory.length > 0 ? (
                <div className="overflow-y-auto max-h-96">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Time
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {txHistory.map((tx, index) => (
                        <tr key={index}>
                          <td className="px-3 py-2 whitespace-nowrap">
                            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                            {tx.amount}
                          </td>
                          <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500">
                            {tx.timestamp}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8">
                  <div className="text-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                    <h3 className="mt-2 text-xs font-medium text-gray-900">No transactions</h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Transaction history will appear here.
                    </p>
                  </div>
                </div>
              )}
              
              {/* TX Detail View Button */}
              {txHistory.length > 0 && (
                <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
                  <a 
                    href="#" 
                    className="text-xs text-gray-600 hover:text-gray-900 flex items-center justify-center"
                  >
                    <span>View all transactions</span>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </a>
                </div>
              )}
            </div>
            
            {/* Info Cards */}
            <div className="mt-4 space-y-4">
              <div className="bg-white shadow rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Your Position</h3>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Collateral:</span>
                  <span className="font-medium">
                    {collateralAmountinEth} ETH
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Borrowed:</span>
                  <span className="font-medium">
                    {borrowedAmountinEth} TestTokens
                  </span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
  <span>Health Factor:</span>
  {healthFactor.status === 'safe' ? (
    <span className="font-medium text-green-600">Safe</span>
  ) : (
    <span className="font-medium text-red-600">Not Safe</span>
  )}
</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <footer className="bg-gray-800 text-gray-400 text-xs py-3 mt-8">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <p>DeFi Lending Protocol &copy; 2025 | All rights reserved</p>
        </div>
      </footer>
    </div>
  );
};

export default Interface;