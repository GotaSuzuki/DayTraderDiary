export type TradeEntry = {
  id: string
  userId: string
  tradeDate: string
  ticker: string
  tickerName: string
  realizedProfit: number | null
  reason: string | null
  reflection: string | null
  imagePath: string | null
  imageUrl?: string
  createdAt: string
  updatedAt: string
}

export type FormState = {
  ticker: string
  tickerName: string
  tradeDate: string
  reason: string
  reflection: string
  realizedProfit: string
}

export type LoginState = {
  email: string
  password: string
}

export type CalendarCell = {
  key: string
  isPlaceholder?: boolean
  day?: number
  profit?: number | null
  isToday?: boolean
}

export type MonthSummary = {
  gains: number
  losses: number
  net: number
}

export type EditEntryDraft = {
  id: string
  reason: string
  reflection: string
  realizedProfitInput: string
}

export type ImageViewerState = {
  src: string
  alt: string
}
