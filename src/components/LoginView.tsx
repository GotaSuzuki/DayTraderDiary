import type { ChangeEvent, FormEvent } from 'react'
import type { LoginState } from '../types'

type LoginViewProps = {
  loginState: LoginState
  isLoggingIn: boolean
  loginError: string
  onChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function LoginView({ loginState, isLoggingIn, loginError, onChange, onSubmit }: LoginViewProps) {
  return (
    <main className="auth-page">
      <section className="panel auth-panel">
        <div>
          <h2>ログイン</h2>
          <p className="panel-description">Supabase Authに登録済みのアカウントでサインインしてください。</p>
        </div>
        <form className="auth-form" onSubmit={onSubmit}>
          <div className="form-row">
            <label htmlFor="email">メールアドレス</label>
            <input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={loginState.email}
              onChange={onChange}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="password">パスワード</label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="パスワード"
              value={loginState.password}
              onChange={onChange}
              required
            />
          </div>
          {loginError && <p className="form-error">{loginError}</p>}
          <div className="auth-actions">
            <button type="submit" className="submit-button" disabled={isLoggingIn}>
              {isLoggingIn ? 'ログイン中...' : 'ログイン'}
            </button>
          </div>
        </form>
        <p className="auth-helper-text">※ 初回利用時はSupabase Authでユーザーを作成してからログインしてください。</p>
      </section>
    </main>
  )
}
