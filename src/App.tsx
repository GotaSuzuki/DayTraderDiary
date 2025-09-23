import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import type { Session } from "@supabase/supabase-js";
import "./App.css";
import { supabase } from "./lib/supabaseClient";
import { CalendarView } from "./components/CalendarView";
import { EditTradeModal } from "./components/EditTradeModal";
import { LoginView } from "./components/LoginView";
import { TradeForm } from "./components/TradeForm";
import type {
  CalendarCell,
  EditEntryDraft,
  FormState,
  ImageViewerState,
  LoginState,
  MonthSummary,
  TradeEntry
} from "./types";

type AppView = "dashboard" | "calendar" | "newEntry" | "login";
type SummaryRange = "daily" | "weekly" | "monthly" | "yearly" | "all";

const SUMMARY_OPTIONS: Array<{ value: SummaryRange; label: string }> = [
  { value: "daily", label: "本日" },
  { value: "weekly", label: "今週" },
  { value: "monthly", label: "今月" },
  { value: "yearly", label: "今年" },
  { value: "all", label: "全期間" }
];

const PAGE_SIZE = 20;

const dateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate()
  ).padStart(2, '0')}`;

const STORAGE_BUCKET = "trade-images";

const todayString = () => new Date().toISOString().slice(0, 10);

const defaultFormState = (): FormState => ({
  ticker: "",
  tickerName: "",
  tradeDate: todayString(),
  reason: "",
  reflection: "",
  realizedProfit: ""
});

const defaultLoginState = (): LoginState => ({
  email: "",
  password: ""
});

const formatCurrency = (value: number) =>
  `${new Intl.NumberFormat("ja-JP", { maximumFractionDigits: 0 }).format(
    value
  )}円`;

function App() {
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [entries, setEntries] = useState<TradeEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [summaryRange, setSummaryRange] = useState<SummaryRange>("daily");
  const [currentView, setCurrentView] = useState<AppView>("dashboard");
  const [formState, setFormState] = useState<FormState>(() =>
    defaultFormState()
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginState, setLoginState] = useState<LoginState>(() =>
    defaultLoginState()
  );
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditEntryDraft | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState("");
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const initSession = async () => {
      const {
        data: { session: initialSession },
        error
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Failed to get Supabase session:", error);
      }
      setSession(initialSession);
      setIsLoading(false);
    };

    initSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const isLoggedIn = Boolean(session?.user);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!isLoggedIn) {
      setCurrentView("login");
    } else if (currentView === "login") {
      setCurrentView("dashboard");
    }
  }, [currentView, isLoading, isLoggedIn]);

  const resetForm = useCallback(() => {
    setFormState(defaultFormState());
    setImageFile(null);
    setFormError("");
    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }, []);

  const applyImageUrl = useCallback(async (entry: TradeEntry) => {
    if (!entry.imagePath) {
      return entry;
    }

    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(entry.imagePath, 60 * 60);

    if (error || !data?.signedUrl) {
      console.warn("Failed to generate image URL", error);
      return entry;
    }

    return { ...entry, imageUrl: data.signedUrl };
  }, []);

  const loadEntries = useCallback(async () => {
    if (!session?.user) {
      setEntries([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError("");

    const { data, error } = await supabase
      .from("trades")
      .select(
        "id, user_id, trade_date, ticker, ticker_name, realized_profit, reason, reflection, image_path, created_at, updated_at"
      )
      .eq("user_id", session.user.id)
      .order("trade_date", { ascending: false });

    if (error) {
      console.error("Failed to fetch trades:", error);
      setLoadError(
        "取引データの取得に失敗しました。しばらくしてから再度お試しください。"
      );
      setEntries([]);
      setIsLoading(false);
      return;
    }

    const mapped = data.map<TradeEntry>((row) => ({
      id: row.id,
      userId: row.user_id,
      tradeDate: row.trade_date,
      ticker: row.ticker,
      tickerName: row.ticker_name ?? "",
      realizedProfit: row.realized_profit ?? null,
      reason: row.reason ?? null,
      reflection: row.reflection ?? null,
      imagePath: row.image_path ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    const withSignedUrls = await Promise.all(mapped.map(applyImageUrl));

    setEntries(withSignedUrls);
    setIsLoading(false);
  }, [applyImageUrl, session?.user]);

  useEffect(() => {
    if (session?.user) {
      loadEntries();
    }
  }, [loadEntries, session?.user]);

  const handleInputChange = (
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target;
    setFormState((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImageFile(file);
  };

  const uploadImageIfNeeded = async (userId: string) => {
    if (!imageFile) {
      return { imagePath: null, previewUrl: undefined as string | undefined };
    }

    const extension = imageFile.name.split(".").pop()?.toLowerCase() || "png";
    const randomId = (
      globalThis.crypto?.randomUUID?.() ??
      `${Date.now()}-${Math.random().toString(16).slice(2)}`
    ).replace(/[^a-zA-Z0-9-]/g, "");
    const path = `${userId}/${randomId}.${extension}`;

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(path, imageFile, {
        cacheControl: "3600",
        upsert: false
      });

    if (error) {
      throw new Error(`画像のアップロードに失敗しました: ${error.message}`);
    }

    const { data } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(path, 60 * 60);

    return { imagePath: path, previewUrl: data?.signedUrl };
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!session?.user) {
      setFormError("投稿するにはログインが必要です。");
      return;
    }

    const trimmedTicker = formState.ticker.trim();
    const trimmedName = formState.tickerName.trim();

    const hasProfitInput = formState.realizedProfit.trim() !== "";
    const profitCandidate = Number(formState.realizedProfit);
    const profitValue =
      hasProfitInput && Number.isFinite(profitCandidate)
        ? profitCandidate
        : null;

    setIsSubmitting(true);
    setFormError("");

    try {
      const { imagePath, previewUrl } = await uploadImageIfNeeded(
        session.user.id
      );

      const { data, error } = await supabase
        .from("trades")
        .insert({
          user_id: session.user.id,
          trade_date: formState.tradeDate,
          ticker: trimmedTicker.toUpperCase(),
          ticker_name: trimmedName || null,
          realized_profit: profitValue,
          reason: formState.reason.trim() || null,
          reflection: formState.reflection.trim() || null,
          image_path: imagePath
        })
        .select(
          "id, user_id, trade_date, ticker, ticker_name, realized_profit, reason, reflection, image_path, created_at, updated_at"
        )
        .single();

      if (error || !data) {
        throw new Error(error?.message ?? "取引の保存に失敗しました。");
      }

      const entry: TradeEntry = {
        id: data.id,
        userId: data.user_id,
        tradeDate: data.trade_date,
        ticker: data.ticker,
        tickerName: data.ticker_name ?? "",
        realizedProfit: data.realized_profit ?? null,
        reason: data.reason ?? null,
        reflection: data.reflection ?? null,
        imagePath: data.image_path ?? null,
        imageUrl: previewUrl,
        createdAt: data.created_at,
        updatedAt: data.updated_at
      };

      setEntries((prev) => [entry, ...prev]);
      resetForm();
      setCurrentView("dashboard");
    } catch (error) {
      console.error(error);
      setFormError(
        error instanceof Error ? error.message : "不明なエラーが発生しました。"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoginChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setLoginState((prev) => ({ ...prev, [name]: value }));
  };

  const openEditEntry = (entry: TradeEntry) => {
    setEditingEntryId(entry.id);
    setEditDraft({
      id: entry.id,
      reason: entry.reason ?? "",
      reflection: entry.reflection ?? "",
      realizedProfitInput:
        entry.realizedProfit !== null ? String(entry.realizedProfit) : ""
    });
    setEditError("");
  };

  const closeEditEntry = () => {
    setEditingEntryId(null);
    setEditDraft(null);
    setEditError("");
    setIsUpdating(false);
  };

  const handleEditChange = (
    event: ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => {
    const { name, value } = event.target;
    setEditDraft((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleDeleteEntry = async (
    entryId: string,
    imagePath: string | null
  ) => {
    const confirmed = window.confirm("この取引日記を削除しますか？");
    if (!confirmed) {
      return;
    }

    const { error } = await supabase.from("trades").delete().eq("id", entryId);
    if (error) {
      console.error("Failed to delete trade:", error);
      alert("削除に失敗しました。しばらくしてから再度お試しください。");
      return;
    }

    if (imagePath) {
      const { error: storageError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([imagePath]);
      if (storageError) {
        console.warn("Failed to delete image from storage:", storageError);
      }
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
  };

  const openImageViewer = (src: string, alt: string) => {
    setImageViewer({ src, alt });
  };

  const closeImageViewer = () => {
    setImageViewer(null);
  };

  const handleSaveEdit = async () => {
    if (!editingEntryId || !editDraft) {
      return;
    }

    const trimmedReason = editDraft.reason.trim();
    const trimmedReflection = editDraft.reflection.trim();
    const trimmedProfit = editDraft.realizedProfitInput.trim();

    let profitValue: number | null = null;
    if (trimmedProfit) {
      const parsed = Number(trimmedProfit);
      if (!Number.isFinite(parsed)) {
        setEditError("損益は数値で入力してください。");
        return;
      }
      profitValue = parsed;
    }

    setIsUpdating(true);
    setEditError("");

    const { data, error } = await supabase
      .from("trades")
      .update({
        reason: trimmedReason || null,
        reflection: trimmedReflection || null,
        realized_profit: profitValue
      })
      .eq("id", editingEntryId)
      .select(
        "id, user_id, trade_date, ticker, ticker_name, realized_profit, reason, reflection, image_path, created_at, updated_at"
      )
      .single();

    if (error || !data) {
      console.error("Failed to update trade:", error);
      setEditError(error?.message ?? "更新に失敗しました。");
      setIsUpdating(false);
      return;
    }

    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === editingEntryId
          ? {
              ...entry,
              reason: data.reason ?? null,
              reflection: data.reflection ?? null,
              realizedProfit: data.realized_profit ?? null,
              updatedAt: data.updated_at
            }
          : entry
      )
    );

    closeEditEntry();
  };

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const email = loginState.email.trim();
    const password = loginState.password;

    if (!email || !password) {
      setLoginError("メールアドレスとパスワードを入力してください。");
      return;
    }

    setIsLoggingIn(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error("Login failed:", error);
      setLoginError(error.message || "ログインに失敗しました。");
      setIsLoggingIn(false);
      return;
    }

    setLoginState(defaultLoginState());
    setIsLoggingIn(false);
    setCurrentView("dashboard");
    await loadEntries();
  };

  const goToPrevMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const goToNextMonth = () => {
    setCalendarMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  const goToCurrentMonth = () => {
    const now = new Date();
    setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Failed to logout:", error);
      return;
    }
    setEntries([]);
    resetForm();
    setLoginState(defaultLoginState());
    goToCurrentMonth();
    setCurrentView("login");
    setIsLoading(false);
  };

  const openFormScreen = () => {
    resetForm();
    setCurrentView("newEntry");
  };

  const openCalendarScreen = () => {
    setCurrentView("calendar");
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, summaryRange]);

  const summaryEntries = useMemo(() => {
    if (!entries.length) {
      return [];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let start: Date | null = null;
    let end: Date | null = null;

    switch (summaryRange) {
      case "daily": {
        start = new Date(today);
        end = new Date(today);
        break;
      }
      case "weekly": {
        const sunday = new Date(today);
        sunday.setDate(today.getDate() - today.getDay());
        start = sunday;
        const saturday = new Date(sunday);
        saturday.setDate(sunday.getDate() + 6);
        end = saturday;
        break;
      }
      case "monthly": {
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        break;
      }
      case "yearly": {
        start = new Date(today.getFullYear(), 0, 1);
        end = new Date(today.getFullYear(), 11, 31);
        break;
      }
      case "all":
      default:
        return entries;
    }

    return entries.filter((entry) => {
      const tradeDate = new Date(entry.tradeDate);
      tradeDate.setHours(0, 0, 0, 0);

      if (start && tradeDate < start) {
        return false;
      }
      if (end && tradeDate > end) {
        return false;
      }
      return true;
    });
  }, [entries, summaryRange]);

  const filteredEntries = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    const sorted = [...summaryEntries].sort((a, b) => {
      const aTime = new Date(a.tradeDate).getTime();
      const bTime = new Date(b.tradeDate).getTime();
      return bTime - aTime;
    });

    if (!normalized) {
      return sorted;
    }

    return sorted.filter((entry) =>
      [entry.ticker, entry.tickerName].some((value) =>
        value.toLowerCase().includes(normalized)
      )
    );
  }, [summaryEntries, searchTerm]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredEntries.length / PAGE_SIZE) || 1
  );

  useEffect(() => {
    setCurrentPage((prev) => (prev > totalPages ? totalPages : prev));
  }, [totalPages]);

  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredEntries.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredEntries, currentPage]);

  const { calendarCells, monthSummary, calendarMonthLabel } = useMemo(() => {
    const startOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
    const endOfMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 0);
    const profitsByDate = new Map<string, number>();

    entries.forEach((entry) => {
      if (
        entry.realizedProfit === null ||
        !Number.isFinite(entry.realizedProfit)
      ) {
        return;
      }
      const tradeDate = new Date(entry.tradeDate);
      if (
        tradeDate.getFullYear() !== calendarMonth.getFullYear() ||
        tradeDate.getMonth() !== calendarMonth.getMonth()
      ) {
        return;
      }
      const key = dateKey(tradeDate);
      profitsByDate.set(key, (profitsByDate.get(key) ?? 0) + entry.realizedProfit);
    });

    let totalProfit = 0;
    let totalLoss = 0;

    profitsByDate.forEach((value) => {
      if (value > 0) {
        totalProfit += value;
      } else if (value < 0) {
        totalLoss += value;
      }
    });

    const todayKey = dateKey(new Date());

    const cells: CalendarCell[] = [];

    const firstWeekday = startOfMonth.getDay();
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push({ key: `placeholder-start-${i}`, isPlaceholder: true });
    }

    for (let day = 1; day <= endOfMonth.getDate(); day += 1) {
      const currentDate = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), day);
      const key = dateKey(currentDate);
      const profit = profitsByDate.has(key) ? profitsByDate.get(key)! : null;
      cells.push({
        key,
        day,
        profit,
        isToday: key === todayKey
      });
    }

    const remainder = cells.length % 7;
    if (remainder) {
      for (let i = remainder; i < 7; i += 1) {
        cells.push({ key: `placeholder-end-${i}`, isPlaceholder: true });
      }
    }

    const monthLabel = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "long"
    }).format(startOfMonth);

    const summary: MonthSummary = {
      gains: totalProfit,
      losses: totalLoss,
      net: totalProfit + totalLoss
    };

    return {
      calendarCells: cells,
      monthSummary: summary,
      calendarMonthLabel: monthLabel
    };
  }, [calendarMonth, entries]);

  const analytics = useMemo(() => {
    const totalTrades = summaryEntries.length;
    if (!totalTrades) {
      return {
        totalTrades: 0,
        totalProfit: 0,
        winRate: 0,
        winSampleCount: 0
      };
    }

    let totalProfit = 0;
    let winCount = 0;
    let profitSamples = 0;

    summaryEntries.forEach((entry) => {
      if (
        entry.realizedProfit === null ||
        !Number.isFinite(entry.realizedProfit)
      ) {
        return;
      }

      totalProfit += entry.realizedProfit;
      profitSamples += 1;

      if (entry.realizedProfit > 0) {
        winCount += 1;
      }
    });

    return {
      totalTrades,
      totalProfit,
      winRate: profitSamples ? winCount / profitSamples : 0,
      winSampleCount: profitSamples
    };
  }, [summaryEntries]);

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-text">
          <h1>トレードダイアリー</h1>
          <p>売買の背景と振り返りを記録して、次のトレードに生かそう。</p>
        </div>
        <nav className="hero-nav" aria-label="メインメニュー">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                className={`hero-nav-button ${
                  currentView === "dashboard" ? "active" : ""
                }`}
                onClick={() => setCurrentView("dashboard")}>
                ダッシュボード
              </button>
              <button
                type="button"
                className={`hero-nav-button ${
                  currentView === "calendar" ? "active" : ""
                }`}
                onClick={openCalendarScreen}>
                カレンダー
              </button>
              <button
                type="button"
                className={`hero-nav-button ${
                  currentView === "newEntry" ? "active" : ""
                }`}
                onClick={openFormScreen}>
                日記を登録
              </button>
              <button
                type="button"
                className="hero-nav-button logout"
                onClick={handleLogout}>
                ログアウト
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`hero-nav-button ${
                currentView === "login" ? "active" : ""
              }`}
              onClick={() => setCurrentView("login")}>
              ログイン
            </button>
          )}
        </nav>
      </header>

      {currentView === "login" ? (
        <LoginView
          loginState={loginState}
          isLoggingIn={isLoggingIn}
          loginError={loginError}
          onChange={handleLoginChange}
          onSubmit={handleLoginSubmit}
        />
      ) : currentView === "dashboard" ? (
        <main className="dashboard-layout">
          <section className="panel analytics-panel">
            <div className="panel-heading">
              <div>
                <h2>取引サマリ</h2>
              </div>
              <div className="summary-controls">
                <span className="summary-controls-label">集計対象</span>
                <div
                  className="summary-range-buttons"
                  role="tablist"
                  aria-label="集計期間切り替え">
                  {SUMMARY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      role="tab"
                      aria-selected={summaryRange === option.value}
                      className={`summary-range-button ${
                        summaryRange === option.value ? "active" : ""
                      }`}
                      onClick={() => setSummaryRange(option.value)}>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {!isLoggedIn ? (
              <p className="empty-state">
                ログインすると取引サマリが表示されます。
              </p>
            ) : summaryEntries.length === 0 ? (
              <p className="empty-state">この期間の記録はまだありません。</p>
            ) : (
              <div className="analytics-grid">
                <article className="metric">
                  <span className="metric-label">取引件数</span>
                  <strong className="metric-value">
                    {analytics.totalTrades}
                  </strong>
                </article>
                <article className="metric">
                  <span className="metric-label">累計損益</span>
                  <strong
                    className={`metric-value ${
                      analytics.totalProfit >= 0 ? "positive" : "negative"
                    }`}>
                    {formatCurrency(analytics.totalProfit)}
                  </strong>
                </article>
                <article className="metric">
                  <span className="metric-label">勝率</span>
                  <strong className="metric-value">
                    {analytics.winSampleCount
                      ? new Intl.NumberFormat("ja-JP", {
                          style: "percent",
                          maximumFractionDigits: 1
                        }).format(analytics.winRate)
                      : "—"}
                  </strong>
                  <span className="metric-footnote">
                    損益入力 {analytics.winSampleCount} 件
                  </span>
                </article>
              </div>
            )}
          </section>

          <section className="panel list-panel">
            <div className="list-header">
              <div>
                <h2>取引履歴</h2>
              </div>
              <input
                className="search-input"
                type="search"
                placeholder="銘柄コード・銘柄名で検索"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            {loadError && <p className="empty-state">{loadError}</p>}

            {isLoading ? (
              <p className="empty-state">読み込み中...</p>
            ) : !isLoggedIn ? (
              <p className="empty-state">
                ログインすると取引履歴が表示されます。
              </p>
            ) : !filteredEntries.length ? (
              <p className="empty-state">
                まだ日記がありません。フォームから追加してみましょう。
              </p>
            ) : (
              <>
                <ul className="entry-list">
                  {paginatedEntries.map((entry) => {
                    const hasProfit =
                      entry.realizedProfit !== undefined &&
                      entry.realizedProfit !== null;

                    return (
                      <li key={entry.id} className="entry-card">
                        <header className="entry-header">
                          <div className="entry-title">
                            <span className="entry-ticker">
                              {entry.ticker || "—"}
                            </span>
                            <span className="entry-ticker-name">
                              {entry.tickerName || "—"}
                            </span>
                          </div>
                          <div className="entry-header-actions">
                            <time className="entry-date">
                              {entry.tradeDate}
                            </time>
                            <button
                              type="button"
                              className="entry-edit-button"
                              onClick={() => openEditEntry(entry)}>
                              編集
                            </button>
                            <button
                              type="button"
                              className="entry-delete-button"
                              onClick={() =>
                                handleDeleteEntry(entry.id, entry.imagePath)
                              }>
                              削除
                            </button>
                          </div>
                        </header>

                        <div className="entry-body">
                          <dl className="entry-stats">
                            <div>
                              <dt>損益</dt>
                              <dd
                                className={
                                  hasProfit && entry.realizedProfit! < 0
                                    ? "negative"
                                    : "positive"
                                }>
                                {hasProfit
                                  ? formatCurrency(entry.realizedProfit!)
                                  : "—"}
                              </dd>
                            </div>
                          </dl>

                          {entry.reason && (
                            <section className="entry-note">
                              <h4>売買理由</h4>
                              <pre className="entry-note-text">
                                {entry.reason}
                              </pre>
                            </section>
                          )}

                          {entry.reflection && (
                            <section className="entry-note">
                              <h4>振り返り</h4>
                              <pre className="entry-note-text">
                                {entry.reflection}
                              </pre>
                            </section>
                          )}

                          {entry.imageUrl && (
                            <figure className="entry-image">
                              <button
                                type="button"
                                className="entry-image-button"
                                onClick={() =>
                                  openImageViewer(
                                    entry.imageUrl ?? '',
                                    `${entry.ticker} の取引メモ`
                                  )
                                }
                              >
                                <img
                                  src={entry.imageUrl}
                                  alt={`${entry.ticker} の取引メモ`}
                                />
                              </button>
                            </figure>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {filteredEntries.length > PAGE_SIZE && (
                  <nav className="pagination" aria-label="取引履歴のページング">
                    <button
                      type="button"
                      className="pagination-button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.max(1, prev - 1))
                      }
                      disabled={currentPage === 1}>
                      前へ
                    </button>
                    <span className="pagination-status">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      type="button"
                      className="pagination-button"
                      onClick={() =>
                        setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                      }
                      disabled={currentPage === totalPages}>
                      次へ
                    </button>
                  </nav>
                )}
              </>
            )}
          </section>
        </main>
      ) : currentView === "calendar" ? (
        <CalendarView
          isLoggedIn={isLoggedIn}
          monthLabel={calendarMonthLabel}
          monthSummary={monthSummary}
          cells={calendarCells}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
          onResetMonth={goToCurrentMonth}
        />
      ) : (
        <TradeForm
          isLoggedIn={isLoggedIn}
          formState={formState}
          imageFile={imageFile}
          isSubmitting={isSubmitting}
          formError={formError}
          maxDate={todayString()}
          fileInputRef={imageInputRef}
          onInputChange={handleInputChange}
          onImageChange={handleImageChange}
          onSubmit={handleSubmit}
          onCancel={() => {
            resetForm();
            setCurrentView("dashboard");
          }}
        />
      )}
      <EditTradeModal
        isOpen={Boolean(editDraft && editingEntryId)}
        draft={editDraft}
        isSaving={isUpdating}
        error={editError}
        onChange={handleEditChange}
        onClose={closeEditEntry}
        onSubmit={handleSaveEdit}
      />
      {imageViewer && (
        <div
          className="viewer-backdrop"
          role="presentation"
          onClick={closeImageViewer}
        >
          <figure
            className="viewer-container"
            onClick={(event) => event.stopPropagation()}
          >
            <img src={imageViewer.src} alt={imageViewer.alt} />
            <figcaption>{imageViewer.alt}</figcaption>
            <button
              type="button"
              className="viewer-close-button"
              onClick={closeImageViewer}
              aria-label="閉じる"
            >
              ✕
            </button>
          </figure>
        </div>
      )}
    </div>
  );
}

export default App;
