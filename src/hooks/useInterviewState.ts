import { useState, useEffect, useCallback } from 'react';
import { InterviewSettings, InterviewQuestion, InterviewSession } from '../types/interview';
import { useAuth } from './useAuth';
import { useNotification } from '../components/NotificationSystem';

interface InterviewState {
  currentScreen: 'home' | 'setup' | 'interview' | 'result';
  interviewSettings: InterviewSettings | null;
  interviewQuestions: InterviewQuestion[];
  sessionRecovered: boolean;
}

const INITIAL_STATE: InterviewState = {
  currentScreen: 'home',
  interviewSettings: null,
  interviewQuestions: [],
  sessionRecovered: false
};

export const useInterviewState = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [state, setState] = useState<InterviewState>(INITIAL_STATE);

  // ユーザー固有のストレージキーを生成
  const getStorageKey = useCallback((key: string) => {
    return user ? `${key}_${user.id}` : `${key}_anonymous`;
  }, [user]);

  // セッション保存
  const saveSession = useCallback((session: InterviewSession) => {
    if (!user) return;
    
    try {
      const sessionKey = getStorageKey('interviewSession');
      const backupKey = getStorageKey('interviewSessionBackup');
      
      const sessionWithUser = {
        ...session,
        userId: user.id,
        lastUpdated: Date.now(),
        version: '4.0'
      };
      
      sessionStorage.setItem(sessionKey, JSON.stringify(sessionWithUser));
      localStorage.setItem(backupKey, JSON.stringify(sessionWithUser));
      
      console.log('Session saved for user:', user.id);
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [user, getStorageKey]);

  // セッション読み込み
  const loadSession = useCallback((): InterviewSession | null => {
    if (!user) return null;
    
    try {
      const sessionKey = getStorageKey('interviewSession');
      const backupKey = getStorageKey('interviewSessionBackup');
      
      let saved = sessionStorage.getItem(sessionKey);
      let session = saved ? JSON.parse(saved) : null;
      
      // セッションストレージにない場合はバックアップから復元
      if (!session) {
        const backup = localStorage.getItem(backupKey);
        session = backup ? JSON.parse(backup) : null;
        
        if (session) {
          console.log('Session restored from backup for user:', user.id);
          sessionStorage.setItem(sessionKey, JSON.stringify(session));
        }
      }
      
      if (session) {
        // ユーザーIDの一致確認
        if (session.userId && session.userId !== user.id) {
          console.log('Session user mismatch, clearing session');
          clearSession();
          return null;
        }
        
        // セッションの有効期限チェック（2時間）
        const now = Date.now();
        const lastUpdated = session.lastUpdated || session.startTime;
        const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;
        
        if (now - lastUpdated > SESSION_TIMEOUT) {
          console.log('Session expired, clearing data');
          clearSession();
          return null;
        }
        
        return session;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to load session:', error);
      clearSession();
      return null;
    }
  }, [user, getStorageKey]);

  // セッションクリア
  const clearSession = useCallback(() => {
    if (!user) return;
    
    try {
      const sessionKey = getStorageKey('interviewSession');
      const backupKey = getStorageKey('interviewSessionBackup');
      
      sessionStorage.removeItem(sessionKey);
      localStorage.removeItem(backupKey);
      
      console.log('Session cleared for user:', user.id);
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }, [user, getStorageKey]);

  // 全ユーザーのセッションをクリア（ログアウト時）
  const clearAllSessions = useCallback(() => {
    try {
      // 面接関連のすべてのキーを削除
      const keysToRemove = [];
      
      // sessionStorageから面接関連キーを検索
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.includes('interviewSession')) {
          keysToRemove.push(key);
        }
      }
      
      // localStorageから面接関連キーを検索
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.includes('interviewSession')) {
          keysToRemove.push(key);
        }
      }
      
      // キーを削除
      keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      });
      
      console.log('All interview sessions cleared');
    } catch (error) {
      console.error('Failed to clear all sessions:', error);
    }
  }, []);

  // ユーザー変更時の処理
  useEffect(() => {
    if (!user) {
      // ユーザーがログアウトした場合、状態をリセット
      setState(INITIAL_STATE);
      return;
    }

    // ユーザーが変更された場合、セッションを復元
    const savedSession = loadSession();
    if (savedSession) {
      setState({
        currentScreen: 'interview',
        interviewSettings: savedSession.settings,
        interviewQuestions: savedSession.questions,
        sessionRecovered: true
      });
      
      showNotification({
        type: 'success',
        title: 'セッションを復元しました',
        message: '前回の面接を続行できます。',
        duration: 4000
      });
    } else {
      // 新しいユーザーまたはセッションなしの場合
      setState(INITIAL_STATE);
    }
  }, [user, loadSession, showNotification]);

  // 面接開始
  const startInterview = useCallback(() => {
    setState(prev => ({ ...prev, currentScreen: 'setup' }));
  }, []);

  // ホームに戻る
  const goToHome = useCallback(() => {
    if (state.currentScreen === 'interview' && state.interviewQuestions.length > 0) {
      const confirmed = window.confirm(
        '面接が進行中です。ホームに戻ると進行状況が失われます。よろしいですか？'
      );
      if (!confirmed) return;
    }
    
    clearSession();
    setState(INITIAL_STATE);
  }, [state.currentScreen, state.interviewQuestions.length, clearSession]);

  // 面接設定で開始
  const startInterviewWithSettings = useCallback((settings: InterviewSettings) => {
    setState(prev => ({
      ...prev,
      currentScreen: 'interview',
      interviewSettings: settings,
      interviewQuestions: [],
      sessionRecovered: false
    }));
  }, []);

  // 面接完了
  const completeInterview = useCallback((questions: InterviewQuestion[]) => {
    setState(prev => ({
      ...prev,
      currentScreen: 'result',
      interviewQuestions: questions
    }));
    clearSession();
  }, [clearSession]);

  // 新しい面接
  const startNewInterview = useCallback(() => {
    clearSession();
    setState(INITIAL_STATE);
  }, [clearSession]);

  // セッション自動保存
  useEffect(() => {
    if (state.currentScreen === 'interview' && state.interviewSettings && user) {
      const session: InterviewSession = {
        settings: state.interviewSettings,
        questions: state.interviewQuestions,
        currentQuestionIndex: state.interviewQuestions.length - 1,
        isCompleted: false,
        startTime: state.interviewQuestions[0]?.timestamp || Date.now(),
        lastUpdated: Date.now(),
        version: '4.0',
        userId: user.id
      };
      
      saveSession(session);
    }
  }, [state.currentScreen, state.interviewSettings, state.interviewQuestions, user, saveSession]);

  return {
    ...state,
    startInterview,
    goToHome,
    startInterviewWithSettings,
    completeInterview,
    startNewInterview,
    clearAllSessions,
    saveSession,
    loadSession,
    clearSession
  };
};