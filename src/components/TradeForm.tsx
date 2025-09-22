import type { ChangeEvent, FormEvent, RefObject } from 'react'
import type { FormState } from '../types'

type TradeFormProps = {
  isLoggedIn: boolean
  formState: FormState
  imageFile: File | null
  isSubmitting: boolean
  formError: string
  maxDate: string
  fileInputRef: RefObject<HTMLInputElement>
  onInputChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  onImageChange: (event: ChangeEvent<HTMLInputElement>) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onCancel: () => void
}

export function TradeForm({
  isLoggedIn,
  formState,
  imageFile,
  isSubmitting,
  formError,
  maxDate,
  fileInputRef,
  onInputChange,
  onImageChange,
  onSubmit,
  onCancel,
}: TradeFormProps) {
  return (
    <main className="form-page">
      <section className="panel form-panel">
        <div>
          <h2>日記を登録</h2>
          <p className="panel-description">毎日の売買をサマリして、学びを蓄積できます。</p>
        </div>
        {!isLoggedIn ? (
          <p className="empty-state">投稿するにはSupabaseでログインしてください。</p>
        ) : (
          <form className="trade-form" onSubmit={onSubmit}>
            <div className="form-row">
              <label htmlFor="ticker">銘柄コード</label>
              <input
                id="ticker"
                name="ticker"
                type="text"
                placeholder="例: 6871"
                value={formState.ticker}
                onChange={onInputChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="tickerName">銘柄名</label>
              <input
                id="tickerName"
                name="tickerName"
                type="text"
                placeholder="例: 日本マイクロニクス"
                value={formState.tickerName}
                onChange={onInputChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="tradeDate">売買日</label>
              <input
                id="tradeDate"
                name="tradeDate"
                type="date"
                value={formState.tradeDate}
                max={maxDate}
                onChange={onInputChange}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="realizedProfit">損益 (円)</label>
              <input
                id="realizedProfit"
                name="realizedProfit"
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="実現損益を記録 (任意)"
                value={formState.realizedProfit}
                onChange={onInputChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="reason">売買理由</label>
              <textarea
                id="reason"
                name="reason"
                rows={3}
                placeholder="どんな狙いでエントリーしたか？"
                value={formState.reason}
                onChange={onInputChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="reflection">振り返りコメント</label>
              <textarea
                id="reflection"
                name="reflection"
                rows={3}
                placeholder="仮説は合っていたか、次に活かせる学びは？"
                value={formState.reflection}
                onChange={onInputChange}
              />
            </div>

            <div className="form-row">
              <label htmlFor="image">画像添付</label>
              <input
                id="image"
                name="image"
                type="file"
                accept="image/*"
                onChange={onImageChange}
                ref={fileInputRef}
              />
              {imageFile && <small>選択中: {imageFile.name}</small>}
            </div>

            {formError && <p className="form-error">{formError}</p>}

            <div className="form-actions">
              <button type="submit" className="submit-button" disabled={isSubmitting}>
                {isSubmitting ? '保存中...' : '日記を保存する'}
              </button>
              <button type="button" className="secondary-button" onClick={onCancel}>
                一覧へ戻る
              </button>
            </div>
          </form>
        )}
      </section>
    </main>
  )
}
