import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  ChevronRight,
  Clipboard,
  Download,
  FileText,
  History,
  KeyRound,
  Menu,
  Printer,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { copyMarkdown, downloadMarkdown } from "./export";
import { createResearch, ResearchError } from "./research";
import {
  clearHistory,
  getAccessKey,
  loadHistory,
  removeHistory,
  saveToHistory,
  setAccessKey as persistAccessKey
} from "./storage";
import type { ResearchInput, ResearchResult, Testament } from "./types";

const EMPTY_INPUT: ResearchInput = {
  reference: "",
  passage: "",
  testament: "auto",
  focus: "",
  depth: "deep"
};

const PROGRESS_STEPS = [
  "본문 구조와 핵심 어휘를 살피는 중",
  "미도트 1–16을 검토하는 중",
  "미도트 17–32를 검토하는 중",
  "신학·설교·종합 해석을 정리하는 중"
];

function App() {
  const [view, setView] = useState<"home" | "form" | "result">("home");
  const [input, setInput] = useState<ResearchInput>(EMPTY_INPUT);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [history, setHistory] = useState<ResearchResult[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [keyOpen, setKeyOpen] = useState(false);
  const [accessKey, setAccessKeyState] = useState("");
  const [draftKey, setDraftKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [progressIndex, setProgressIndex] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const savedKey = getAccessKey();
    setAccessKeyState(savedKey);
    setDraftKey(savedKey);
    setHistory(loadHistory());
  }, []);

  useEffect(() => {
    if (!loading) return;
    const timer = window.setInterval(() => {
      setProgressIndex((index) => Math.min(index + 1, PROGRESS_STEPS.length - 1));
    }, 6500);
    return () => window.clearInterval(timer);
  }, [loading]);

  const passageCount = input.passage.trim().length;
  const canSubmit = input.reference.trim().length >= 2 && passageCount >= 20 && !loading;
  const activeSectionIds = useMemo(
    () => result?.sections.map((section) => section.id) || [],
    [result]
  );

  function beginNewStudy() {
    setInput(EMPTY_INPUT);
    setResult(null);
    setError("");
    setView("form");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function openStudy(item: ResearchResult) {
    setResult(item);
    setInput(item.input);
    setView("result");
    setHistoryOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function saveKey() {
    const value = draftKey.trim();
    persistAccessKey(value);
    setAccessKeyState(value);
    setKeyOpen(false);
    setError("");
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    if (!accessKey) {
      setDraftKey("");
      setKeyOpen(true);
      setError("연구를 시작하려면 배포 접근 키를 먼저 입력해 주세요.");
      return;
    }

    controllerRef.current = new AbortController();
    setLoading(true);
    setProgressIndex(0);
    setError("");
    try {
      const next = await createResearch(
        {
          ...input,
          reference: input.reference.trim(),
          passage: input.passage.trim(),
          focus: input.focus.trim()
        },
        accessKey,
        controllerRef.current.signal
      );
      setResult(next);
      setHistory(saveToHistory(next));
      setView("result");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (caught) {
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("연구 생성을 취소했습니다.");
      } else if (caught instanceof ResearchError) {
        setError(
          caught.code === "UNAUTHORIZED"
            ? "접근 키가 맞지 않습니다. 오른쪽 위 열쇠 버튼에서 다시 입력해 주세요."
            : `${caught.message}${caught.requestId ? ` (요청 ID: ${caught.requestId})` : ""}`
        );
      } else {
        setError("예상하지 못한 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
    } finally {
      setLoading(false);
      controllerRef.current = null;
    }
  }

  async function handleCopy() {
    if (!result) return;
    await copyMarkdown(result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setView("home")}
          aria-label="미도트 32 홈"
        >
          <span className="brand-mark">32</span>
          <span>
            <strong>MIDOT LAB</strong>
            <small>성경 해석 연구소</small>
          </span>
        </button>
        <nav className="top-actions" aria-label="주요 메뉴">
          <button
            className="icon-text-button"
            onClick={() => setHistoryOpen(true)}
            aria-label="내 연구"
          >
            <History size={18} />
            <span>내 연구</span>
          </button>
          <button
            className={`icon-button ${accessKey ? "is-ready" : ""}`}
            onClick={() => {
              setDraftKey(accessKey);
              setKeyOpen(true);
            }}
            aria-label="접근 키 설정"
            title="접근 키 설정"
          >
            <KeyRound size={19} />
          </button>
        </nav>
      </header>

      <main>
        {view === "home" && (
          <Home
            history={history}
            onStart={beginNewStudy}
            onOpenHistory={() => setHistoryOpen(true)}
            onOpenStudy={openStudy}
          />
        )}
        {view === "form" && (
          <ResearchForm
            input={input}
            setInput={setInput}
            passageCount={passageCount}
            canSubmit={canSubmit}
            error={error}
            onSubmit={submit}
            onBack={() => setView("home")}
          />
        )}
        {view === "result" && result && (
          <ResultView
            result={result}
            sectionIds={activeSectionIds}
            copied={copied}
            onCopy={handleCopy}
            onDownload={() => downloadMarkdown(result)}
            onPrint={() => window.print()}
            onNew={beginNewStudy}
          />
        )}
      </main>

      <footer className="site-footer">
        <span>미도트 32는 해석을 돕는 연구 틀이지, 성경 본문이나 성령의 조명을 대신하지 않습니다.</span>
        <span>AI 결과의 원어·인용·고전 문헌 정보는 반드시 재검증하세요.</span>
      </footer>

      {historyOpen && (
        <HistoryDrawer
          items={history}
          onClose={() => setHistoryOpen(false)}
          onOpen={openStudy}
          onRemove={(id) => setHistory(removeHistory(id))}
          onClear={() => {
            clearHistory();
            setHistory([]);
          }}
        />
      )}

      {keyOpen && (
        <KeyDialog
          value={draftKey}
          onChange={setDraftKey}
          onSave={saveKey}
          onClose={() => setKeyOpen(false)}
        />
      )}

      {loading && (
        <ProgressDialog
          step={progressIndex}
          onCancel={() => controllerRef.current?.abort()}
        />
      )}
    </div>
  );
}

function Home({
  history,
  onStart,
  onOpenHistory,
  onOpenStudy
}: {
  history: ResearchResult[];
  onStart: () => void;
  onOpenHistory: () => void;
  onOpenStudy: (item: ResearchResult) => void;
}) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">RABBI ELIEZER · 32 HERMENEUTICAL RULES</p>
          <h1>
            한 본문을 더 깊게,
            <br />
            설교까지 더 분명하게.
          </h1>
          <p className="hero-description">
            성경 본문을 입력하면 랍비 엘리에제르의 32가지 미도트로 적용 가능성을
            정직하게 검토하고, 복음주의적 신학 정리와 설교 적용, 최종 종합 해석까지
            하나의 연구 노트로 완성합니다.
          </p>
          <div className="hero-actions">
            <button className="primary-button large" onClick={onStart}>
              새 본문 연구하기 <ChevronRight size={19} />
            </button>
            {history.length > 0 && (
              <button className="secondary-button large" onClick={onOpenHistory}>
                <History size={18} /> 이전 연구 보기
              </button>
            )}
          </div>
        </div>
        <div className="hero-visual" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="book-card">
            <span className="book-number">32</span>
            <span className="book-line" />
            <span className="book-label">מידות</span>
          </div>
          <div className="floating-note note-one">◎ 직접 적용</div>
          <div className="floating-note note-two">○ 자연스러운 적용</div>
          <div className="floating-note note-three">△ 보조적 적용</div>
        </div>
      </section>

      <section className="workflow-section">
        <div className="section-heading">
          <p className="eyebrow">RESEARCH WORKFLOW</p>
          <h2>본문에서 설교까지, 네 단계로</h2>
        </div>
        <div className="workflow-grid">
          {[
            ["01", "본문 관찰", "문맥·구조·핵심 어휘와 가능한 원어 관찰"],
            ["02", "32 미도트", "각 규칙의 적용 강도와 해석 가치, 한계 표시"],
            ["03", "신학적 통합", "본문의 역사적 의미와 복음주의 정경 해석 구분"],
            ["04", "설교 설계", "오해 방지, 적용 질문, 개요와 최종 종합 해석"]
          ].map(([number, title, description]) => (
            <article className="workflow-card" key={number}>
              <span>{number}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="principles">
        <div>
          <p className="eyebrow">INTERPRETIVE GUARDRAILS</p>
          <h2>깊이 읽되, 과장하지 않습니다.</h2>
        </div>
        <div className="principle-list">
          <div><ShieldCheck /><span>적용되지 않는 규칙은 ‘— 보류’로 표시합니다.</span></div>
          <div><BookOpen /><span>본문의 1차 의미와 기독교 정경적 적용을 구분합니다.</span></div>
          <div><FileText /><span>확인할 수 없는 인용이나 문헌 출처를 만들어내지 않습니다.</span></div>
        </div>
      </section>

      {history.length > 0 && (
        <section className="recent-section">
          <div className="section-heading row">
            <div>
              <p className="eyebrow">RECENT STUDIES</p>
              <h2>최근 연구</h2>
            </div>
            <button className="text-button" onClick={onOpenHistory}>
              전체 보기 <ChevronRight size={16} />
            </button>
          </div>
          <div className="recent-grid">
            {history.slice(0, 3).map((item) => (
              <button className="recent-card" key={item.id} onClick={() => onOpenStudy(item)}>
                <BookOpen size={20} />
                <strong>{item.input.reference}</strong>
                <span>{new Date(item.createdAt).toLocaleDateString("ko-KR")}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function ResearchForm({
  input,
  setInput,
  passageCount,
  canSubmit,
  error,
  onSubmit,
  onBack
}: {
  input: ResearchInput;
  setInput: (value: ResearchInput) => void;
  passageCount: number;
  canSubmit: boolean;
  error: string;
  onSubmit: (event: FormEvent) => void;
  onBack: () => void;
}) {
  const update = <K extends keyof ResearchInput>(key: K, value: ResearchInput[K]) =>
    setInput({ ...input, [key]: value });

  return (
    <section className="form-page">
      <button className="back-button" onClick={onBack}>
        <ArrowLeft size={18} /> 홈으로
      </button>
      <div className="form-heading">
        <p className="eyebrow">NEW RESEARCH</p>
        <h1>연구할 본문을 입력해 주세요.</h1>
        <p>정확한 번역문을 붙여넣을수록 문장 구조와 반복 표현을 더 신뢰성 있게 분석합니다.</p>
      </div>

      <form className="research-form" onSubmit={onSubmit}>
        <div className="field-row">
          <label className="field">
            <span>성경 본문 위치 <em>필수</em></span>
            <input
              value={input.reference}
              onChange={(event) => update("reference", event.target.value)}
              placeholder="예: 예레미야 33장 2–3절"
              maxLength={120}
              autoFocus
            />
          </label>
          <label className="field">
            <span>성경 구분</span>
            <select
              value={input.testament}
              onChange={(event) => update("testament", event.target.value as Testament)}
            >
              <option value="auto">자동 판별</option>
              <option value="old">구약성경</option>
              <option value="new">신약성경</option>
            </select>
          </label>
        </div>

        <label className="field">
          <span>연구 본문 전문 <em>필수</em></span>
          <textarea
            className="passage-input"
            value={input.passage}
            onChange={(event) => update("passage", event.target.value)}
            placeholder={"사용할 성경 번역의 본문을 여기에 붙여넣으세요.\n\n절 번호를 포함해도 좋습니다."}
            maxLength={12000}
          />
          <small className={passageCount > 11000 ? "warning" : ""}>
            {passageCount.toLocaleString()} / 12,000자
          </small>
        </label>

        <label className="field">
          <span>특별히 살펴볼 질문 <i>선택</i></span>
          <textarea
            className="focus-input"
            value={input.focus}
            onChange={(event) => update("focus", event.target.value)}
            placeholder="예: 이 본문에서 언약 회복과 기도의 관계를 집중적으로 살펴봐 줘."
            maxLength={600}
          />
        </label>

        <fieldset className="depth-field">
          <legend>연구 깊이</legend>
          <label className={input.depth === "standard" ? "selected" : ""}>
            <input
              type="radio"
              name="depth"
              checked={input.depth === "standard"}
              onChange={() => update("depth", "standard")}
            />
            <span><strong>표준 연구</strong><small>핵심 위주로 간결하게</small></span>
          </label>
          <label className={input.depth === "deep" ? "selected" : ""}>
            <input
              type="radio"
              name="depth"
              checked={input.depth === "deep"}
              onChange={() => update("depth", "deep")}
            />
            <span><strong>심층 연구</strong><small>32개 규칙과 신학·설교를 충분히</small></span>
          </label>
        </fieldset>

        {error && <div className="error-banner" role="alert">{error}</div>}

        <div className="submit-area">
          <div>
            <ShieldCheck size={17} />
            <span>입력한 본문은 연구 생성에만 사용되며 앱이 별도로 저장하지 않습니다.</span>
          </div>
          <button className="primary-button large" disabled={!canSubmit} type="submit">
            <Sparkles size={19} /> 32 미도트 연구 시작
          </button>
        </div>
      </form>
    </section>
  );
}

function ResultView({
  result,
  sectionIds,
  copied,
  onCopy,
  onDownload,
  onPrint,
  onNew
}: {
  result: ResearchResult;
  sectionIds: string[];
  copied: boolean;
  onCopy: () => void;
  onDownload: () => void;
  onPrint: () => void;
  onNew: () => void;
}) {
  return (
    <section className="result-page">
      <header className="result-hero">
        <div>
          <p className="eyebrow">COMPLETED RESEARCH</p>
          <h1>{result.input.reference}</h1>
          <p>
            32가지 미도트 연구 · {result.input.depth === "deep" ? "심층" : "표준"} ·{" "}
            {Math.max(1, Math.round(result.meta.durationMs / 1000))}초
          </p>
        </div>
        <button className="primary-button" onClick={onNew}>
          <Sparkles size={17} /> 새 연구
        </button>
      </header>

      <div className="result-layout">
        <aside className="result-nav">
          <p>연구 목차</p>
          {result.sections.map((section, index) => (
            <a key={section.id} href={`#${section.id}`}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              {section.title}
            </a>
          ))}
          <div className="result-actions">
            <button onClick={onCopy}>{copied ? <Check /> : <Clipboard />} {copied ? "복사됨" : "전체 복사"}</button>
            <button onClick={onDownload}><Download /> 마크다운 저장</button>
            <button onClick={onPrint}><Printer /> 인쇄 / PDF</button>
          </div>
        </aside>

        <article className="result-content">
          <div className="source-passage">
            <span>입력 본문</span>
            <p>{result.input.passage}</p>
          </div>
          {result.sections.map((section) => (
            <section className="markdown-section" id={section.id} key={section.id}>
              <div className="markdown-section-title">
                <span>{String(sectionIds.indexOf(section.id) + 1).padStart(2, "0")}</span>
                <h2>{section.title}</h2>
              </div>
              <div className="markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{section.markdown}</ReactMarkdown>
              </div>
            </section>
          ))}
          <div className="caution-box">
            <ShieldCheck />
            <div>
              <strong>연구 사용 안내</strong>
              <p>{result.meta.caution}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="mobile-result-bar">
        <button onClick={onCopy}>{copied ? <Check /> : <Clipboard />}<span>{copied ? "복사됨" : "복사"}</span></button>
        <button onClick={onDownload}><Download /><span>저장</span></button>
        <button onClick={onPrint}><Printer /><span>인쇄</span></button>
        <button onClick={onNew}><Sparkles /><span>새 연구</span></button>
      </div>
    </section>
  );
}

function HistoryDrawer({
  items,
  onClose,
  onOpen,
  onRemove,
  onClear
}: {
  items: ResearchResult[];
  onClose: () => void;
  onOpen: (item: ResearchResult) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <aside className="drawer" role="dialog" aria-modal="true" aria-label="내 연구" onMouseDown={(e) => e.stopPropagation()}>
        <header>
          <div><History /><h2>내 연구</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="닫기"><X /></button>
        </header>
        {items.length === 0 ? (
          <div className="empty-history">
            <Archive />
            <strong>아직 저장된 연구가 없습니다.</strong>
            <p>완료한 연구는 이 브라우저에 자동으로 보관됩니다.</p>
          </div>
        ) : (
          <>
            <div className="history-list">
              {items.map((item) => (
                <article key={item.id}>
                  <button className="history-main" onClick={() => onOpen(item)}>
                    <BookOpen />
                    <span>
                      <strong>{item.input.reference}</strong>
                      <small>{new Date(item.createdAt).toLocaleString("ko-KR")}</small>
                    </span>
                    <ChevronRight />
                  </button>
                  <button className="delete-button" onClick={() => onRemove(item.id)} aria-label={`${item.input.reference} 삭제`}>
                    <Trash2 />
                  </button>
                </article>
              ))}
            </div>
            <button className="clear-button" onClick={onClear}>모든 연구 기록 삭제</button>
          </>
        )}
      </aside>
    </div>
  );
}

function KeyDialog({
  value,
  onChange,
  onSave,
  onClose
}: {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div className="overlay centered" role="presentation" onMouseDown={onClose}>
      <form
        className="key-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="key-title"
        onMouseDown={(e) => e.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          onSave();
        }}
      >
        <button className="icon-button close-dialog" onClick={onClose} aria-label="닫기"><X /></button>
        <span className="dialog-icon"><KeyRound /></span>
        <h2 id="key-title">배포 접근 키</h2>
        <p>공개 AI 사용량을 보호하기 위한 키입니다. 이 PC의 브라우저에만 저장됩니다.</p>
        <label className="field">
          <span>접근 키</span>
          <input
            type="password"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="발급받은 키를 입력하세요"
            autoFocus
          />
        </label>
        <button className="primary-button full" type="submit" disabled={value.trim().length < 12}>
          저장하고 사용하기
        </button>
      </form>
    </div>
  );
}

function ProgressDialog({ step, onCancel }: { step: number; onCancel: () => void }) {
  return (
    <div className="overlay centered progress-overlay" role="alert" aria-live="polite">
      <section className="progress-dialog">
        <div className="research-animation">
          <span>32</span>
          <div className="scan-line" />
        </div>
        <p className="eyebrow">AI RESEARCH IN PROGRESS</p>
        <h2>{PROGRESS_STEPS[step]}</h2>
        <p>심층 연구는 보통 1–3분 정도 걸립니다. 창을 닫지 말고 잠시 기다려 주세요.</p>
        <div className="progress-steps">
          {PROGRESS_STEPS.map((label, index) => (
            <div className={index < step ? "done" : index === step ? "active" : ""} key={label}>
              <span>{index < step ? <Check /> : index + 1}</span>
              <small>{label}</small>
            </div>
          ))}
        </div>
        <button className="text-button" onClick={onCancel}>연구 취소</button>
      </section>
    </div>
  );
}

export default App;
