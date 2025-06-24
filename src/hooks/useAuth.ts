import { useState, useEffect } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  previousUserId: string | null;
}

export const useAuth = (): AuthState => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  useEffect(() => {
    // 現在のセッション取得
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
          
          // 特定のエラーに対する詳細なメッセージ
          if (error.message?.includes('session_not_found') || error.message?.includes('Session from session_id claim in JWT does not exist')) {
            setError('Supabase設定エラー: 開発環境のURLが許可されていません。Supabaseダッシュボードで設定を確認してください。');
          } else if (error.message?.includes('Invalid JWT')) {
            setError('認証トークンが無効です。ページを再読み込みしてください。');
          } else {
            setError(`認証エラー: ${error.message}`);
          }
        } else {
          setSession(session);
          setUser(session?.user ?? null);
          setError(null);
          
          // 初回ロード時の前回ユーザーIDを設定
          if (session?.user) {
            setPreviousUserId(session.user.id);
          }
        }
      } catch (error) {
        console.error('Error in getSession:', error);
        setError('ネットワーク接続エラーが発生しました。');
      } finally {
        setLoading(false);
      }
    };

    getSession();

    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        // エラーをクリア
        setError(null);
        
        // ユーザー変更の検出
        const newUserId = session?.user?.id || null;
        const userChanged = previousUserId !== newUserId;
        
        if (userChanged) {
          console.log('User changed:', { from: previousUserId, to: newUserId });
          
          // ユーザー変更時に面接関連データをクリア
          if (event === 'SIGNED_OUT' || (event === 'SIGNED_IN' && previousUserId && newUserId !== previousUserId)) {
            clearAllInterviewData();
          }
          
          setPreviousUserId(newUserId);
        }
        
        // メール認証完了時の処理
        if (event === 'SIGNED_IN' && session) {
          // URLのハッシュフラグメントをクリア（認証トークンを削除）
          if (window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname);
          }
        }
        
        // ログアウト時の処理
        if (event === 'SIGNED_OUT') {
          clearAllInterviewData();
          // 音声認識を停止
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        }
        
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [previousUserId]);

  return { user, session, loading, error, previousUserId };
};

// 面接関連データを完全にクリアする関数
const clearAllInterviewData = () => {
  try {
    // 面接関連のすべてのキーを削除
    const keysToRemove: string[] = [];
    
    // sessionStorageから面接関連キーを検索
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('interview') || key.includes('speech') || key.includes('voice'))) {
        keysToRemove.push(key);
      }
    }
    
    // localStorageから面接関連キーを検索
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes('interview') || key.includes('speech') || key.includes('voice'))) {
        keysToRemove.push(key);
      }
    }
    
    // キーを削除
    keysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
    
    console.log('All interview data cleared:', keysToRemove);
  } catch (error) {
    console.error('Failed to clear interview data:', error);
  }
};

// 認証関連のユーティリティ関数
export const authHelpers = {
  signIn: async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { data, error };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'ログインに失敗しました。ネットワーク接続を確認してください。' 
        } 
      };
    }
  },

  signUp: async (email: string, password: string) => {
    try {
      // 開発環境と本番環境の適切なリダイレクトURL設定
      const currentOrigin = window.location.origin;
      const redirectTo = `${currentOrigin}/auth/callback`;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo
        }
      });
      return { data, error };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'アカウント作成に失敗しました。ネットワーク接続を確認してください。' 
        } 
      };
    }
  },

  signOut: async () => {
    try {
      // ログアウト前に面接関連データをクリア
      clearAllInterviewData();
      
      // 音声認識を停止
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      
      const { error } = await supabase.auth.signOut();
      
      // ログアウト後に追加のクリーンアップ
      setTimeout(() => {
        clearAllInterviewData();
      }, 100);
      
      return { error };
    } catch (error: any) {
      console.error('Sign out error:', error);
      return { 
        error: { 
          message: error.message || 'ログアウトに失敗しました。' 
        } 
      };
    }
  },

  resetPassword: async (email: string) => {
    try {
      // 開発環境と本番環境の適切なリダイレクトURL設定
      const currentOrigin = window.location.origin;
      const redirectTo = `${currentOrigin}/auth/callback`;

      const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      return { data, error };
    } catch (error: any) {
      console.error('Reset password error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'パスワードリセットに失敗しました。ネットワーク接続を確認してください。' 
        } 
      };
    }
  },

  updatePassword: async (password: string) => {
    try {
      const { data, error } = await supabase.auth.updateUser({
        password,
      });
      return { data, error };
    } catch (error: any) {
      console.error('Update password error:', error);
      return { 
        data: null, 
        error: { 
          message: error.message || 'パスワード更新に失敗しました。' 
        } 
      };
    }
  },
};