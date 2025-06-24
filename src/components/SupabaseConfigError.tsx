import React from 'react';
import { AlertTriangle, ExternalLink, Settings } from 'lucide-react';

interface SupabaseConfigErrorProps {
  error: string;
  onRetry?: () => void;
}

export const SupabaseConfigError: React.FC<SupabaseConfigErrorProps> = ({ error, onRetry }) => {
  const isConfigError = error.includes('Supabase設定エラー') || error.includes('session_not_found');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 shadow-lg border border-red-200 max-w-2xl w-full">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-red-100 rounded-full">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">設定エラー</h1>
            <p className="text-gray-600">Supabaseの設定に問題があります</p>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-medium">{error}</p>
        </div>

        {isConfigError && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                解決方法
              </h3>
              <div className="text-blue-800 space-y-2">
                <p>以下の手順でSupabaseの設定を更新してください：</p>
                <ol className="list-decimal list-inside space-y-1 ml-4">
                  <li>Supabaseダッシュボードにアクセス</li>
                  <li>プロジェクト「Shukatsu Shoji Mogimensetsu」を選択</li>
                  <li>左サイドバーの「Authentication」→「Settings」に移動</li>
                  <li>「Site URL」に以下を追加：
                    <code className="bg-blue-100 px-2 py-1 rounded text-sm ml-2">
                      https://localhost:5173
                    </code>
                  </li>
                  <li>「Redirect URLs」に以下を追加：
                    <code className="bg-blue-100 px-2 py-1 rounded text-sm ml-2">
                      https://localhost:5173/auth/callback
                    </code>
                  </li>
                  <li>設定を保存</li>
                </ol>
              </div>
            </div>

            <div className="flex gap-4">
              <a
                href="https://supabase.com/dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
                Supabaseダッシュボードを開く
              </a>
              
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  設定後に再試行
                </button>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-medium text-yellow-900 mb-2">💡 ヒント</h4>
              <p className="text-yellow-800 text-sm">
                本番環境では、実際のドメイン（例：https://your-domain.com）を設定してください。
                開発環境用のURLは開発時のみ使用し、本番デプロイ前に削除することをお勧めします。
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};