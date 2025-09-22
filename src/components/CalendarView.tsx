import type { CalendarCell, MonthSummary } from '../types'

const formatter = new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 })

type CalendarViewProps = {
  isLoggedIn: boolean
  monthLabel: string
  monthSummary: MonthSummary
  cells: CalendarCell[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onResetMonth: () => void
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export function CalendarView({
  isLoggedIn,
  monthLabel,
  monthSummary,
  cells,
  onPrevMonth,
  onNextMonth,
  onResetMonth,
}: CalendarViewProps) {
  return (
    <main className="calendar-page">
      <section className="panel calendar-panel">
        <div className="calendar-header">
          <div>
            <h2>損益カレンダー</h2>
            <p className="panel-description">{monthLabel} の日別損益</p>
          </div>
          <div className="calendar-month-controls">
            <button type="button" className="month-nav-button" onClick={onPrevMonth} aria-label="前の月">
              ‹
            </button>
            <span className="calendar-month-label">{monthLabel}</span>
            <button type="button" className="month-nav-button" onClick={onNextMonth} aria-label="次の月">
              ›
            </button>
            <button type="button" className="month-reset-button" onClick={onResetMonth}>
              今月
            </button>
          </div>
        </div>
        {!isLoggedIn ? (
          <p className="empty-state">ログインするとカレンダーが表示されます。</p>
        ) : (
          <>
            <div className="calendar-summary">
              <article className="calendar-summary-card">
                <span className="calendar-summary-label">利益</span>
                <strong className="calendar-summary-value positive">{formatCurrency(monthSummary.gains)}</strong>
              </article>
              <article className="calendar-summary-card">
                <span className="calendar-summary-label">損</span>
                <strong className="calendar-summary-value negative">{formatCurrency(monthSummary.losses)}</strong>
              </article>
              <article className="calendar-summary-card">
                <span className="calendar-summary-label">損益</span>
                <strong
                  className={`calendar-summary-value ${
                    monthSummary.net > 0 ? 'positive' : monthSummary.net < 0 ? 'negative' : 'neutral'
                  }`}
                >
                  {formatCurrency(monthSummary.net)}
                </strong>
              </article>
            </div>
            <div className="calendar-weekdays">
              {WEEKDAYS.map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {cells.map((cell) => {
                if (cell.isPlaceholder) {
                  return <div key={cell.key} className="calendar-cell placeholder" />
                }

                const profit = cell.profit ?? null
                const profitClass =
                  profit === null
                    ? ''
                    : profit > 0
                      ? 'positive'
                      : profit < 0
                        ? 'negative'
                        : 'neutral'

                return (
                  <div
                    key={cell.key}
                    className={`calendar-cell ${cell.isToday ? 'today' : ''} ${profitClass}`}
                  >
                    <span className="calendar-day-number">{cell.day}</span>
                    <span className="calendar-profit">
                      {profit !== null ? `${formatter.format(profit)}円` : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>
    </main>
  )
}

const currencyFormatter = new Intl.NumberFormat('ja-JP', {
  maximumFractionDigits: 0,
})

function formatCurrency(value: number) {
  return `${currencyFormatter.format(value)}円`
}
