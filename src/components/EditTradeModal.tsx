import type { ChangeEvent } from 'react'
import type { EditEntryDraft } from '../types'

const formatter = new Intl.NumberFormat('ja-JP', {
  style: 'currency',
  currency: 'JPY',
  maximumFractionDigits: 0,
})

const previewValue = (value: string) => {
  if (!value.trim()) {
    return '—'
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return value
  }
  return formatter.format(parsed)
}

type EditTradeModalProps = {
  isOpen: boolean
  draft: EditEntryDraft | null
  isSaving: boolean
  error: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => void
  onClose: () => void
  onSubmit: () => void
}

export function EditTradeModal({ isOpen, draft, isSaving, error, onChange, onClose, onSubmit }: EditTradeModalProps) {
  if (!isOpen || !draft) {
    return null
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="modal-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-trade-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2 id="edit-trade-title">日記を編集</h2>
            <p className="modal-subtitle">売買理由や振り返り、損益を修正できます。</p>
          </div>
          <button type="button" className="modal-close-button" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </header>

        <form
          className="modal-body"
          onSubmit={(event) => {
            event.preventDefault()
            onSubmit()
          }}
        >
          <div className="form-row">
            <label htmlFor="edit-reason">売買理由</label>
            <textarea
              id="edit-reason"
              name="reason"
              rows={3}
              value={draft.reason}
              onChange={onChange}
              placeholder="エントリーの背景や狙いを記録"
            />
          </div>

          <div className="form-row">
            <label htmlFor="edit-reflection">振り返り</label>
            <textarea
              id="edit-reflection"
              name="reflection"
              rows={3}
              value={draft.reflection}
              onChange={onChange}
              placeholder="得られた学びや次回に活かしたい点"
            />
          </div>

          <div className="form-row">
            <label htmlFor="edit-profit">損益 (円)</label>
            <input
              id="edit-profit"
              name="realizedProfitInput"
              type="number"
              inputMode="decimal"
              step="0.01"
              value={draft.realizedProfitInput}
              onChange={onChange}
              placeholder="例: 12345 or -6789"
            />
            <small className="modal-footnote">プレビュー: {previewValue(draft.realizedProfitInput)}</small>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={isSaving}>
              キャンセル
            </button>
            <button type="submit" className="submit-button" disabled={isSaving}>
              {isSaving ? '更新中…' : '変更を保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
