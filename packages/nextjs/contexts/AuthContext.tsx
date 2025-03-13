"use client"; 

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { usePublicClient, useWalletClient } from 'wagmi';

interface AuthContextType {
  isAuthenticated: boolean;
  login: () => Promise<void>;
  logout: () => void;
  user: {
    address: string;
    username: string;
  } | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const [user, setUser] = useState<{ address: string; username: string; } | null>(null);
  const { signMessageAsync } = useSignMessage();
  
  const login = async () => {
    if (!address) return;
    
    try {
      // 生成随机 nonce
      const nonce = Math.floor(Math.random() * 1000000).toString();
      const message = `请签名以登录 Nonce: ${nonce}`;
      
      // 请求用户签名
      const signature = await signMessageAsync({ message });
      
      // 验证签名并获取用户信息
      // 这里可以调用您的 UserRegistry 合约
      setUser({
        address,
        username: `User-${address.slice(0, 6)}`
      });
      
      localStorage.setItem('auth_token', signature);
      
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth_token');
  };
  
  useEffect(() => {
    if (!isConnected) {
      logout();
    }
  }, [isConnected]);
  
  return (
    <AuthContext.Provider value={{ isAuthenticated: !!user, login, logout, user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 