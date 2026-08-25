"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type AssetType = "a-share" | "fund-etf";

type ResearchNote = {
  id: string;
  assetCode: string;
  assetType: AssetType;
  createdAt: number;
  reason: string;
  observation: string;
  plan: string;
  risk: string;
};

type ResearchBackup = {
  version: 1;
  exportedAt: number;
  notes: ResearchNote[];
};

type Props = {
  assetCode: string;
  assetType: AssetType;
};

const STORAGE_KEY = "myinvest.researchNotes.v1";

const fields = [
  { key: "reason", label: "为何关注" },
  { key: "observation", label: "观察点" },
  { key: "plan", label: "计划" },
  { key: "risk", label: "风险点" },
] as const;

type NoteField = (typeof fields)[number]["key"];
type Draft = Record<NoteField, string>;

const emptyDraft = (): Draft => ({
  reason: "",
  observation: "",
  plan: "",
  risk: "",
});

function isResearchNote(value: unknown): value is ResearchNote {
  if (!value || typeof value !== "object") return false;

  const note = value as Record<string, unknown>;
  return (
    typeof note.id === "string" &&
    typeof note.assetCode === "string" &&
    (note.assetType === "a-share" || note.assetType === "fund-etf") &&
    typeof note.createdAt === "number" &&
    Number.isFinite(note.createdAt) &&
    typeof note.reason === "string" &&
    typeof note.observation === "string" &&
    typeof note.plan === "string" &&
    typeof note.risk === "string"
  );
}

function isResearchBackup(value: unknown): value is ResearchBackup {
  if (!value || typeof value !== "object") return false;

  const backup = value as Record<string, unknown>;
  return (
    backup.version === 1 &&
    typeof backup.exportedAt === "number" &&
    Number.isFinite(backup.exportedAt) &&
    Array.isArray(backup.notes) &&
    backup.notes.every(isResearchNote)
  );
}

function formatShanghaiTime(timestamp: number): string {
  const values = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(new Date(timestamp))
      .map((part) => [part.type, part.value]),
  );
  return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}`;
}

function createId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `note-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export default function ResearchNotes({ assetCode, assetType }: Props) {
  const [notes, setNotes] = useState<ResearchNote[]>([]);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [unreadable, setUnreadable] = useState(false);
  const [restoreError, setRestoreError] = useState(false);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return;

    try {
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed) || !parsed.every(isResearchNote)) {
        throw new Error("Invalid research notes");
      }
      setNotes(parsed);
    } catch {
      setUnreadable(true);
    }
  }, []);

  const assetNotes = useMemo(
    () =>
      notes
        .filter(
          (note) =>
            note.assetCode === assetCode && note.assetType === assetType,
        )
        .sort((a, b) => b.createdAt - a.createdAt),
    [assetCode, assetType, notes],
  );
  const canSave = !unreadable && fields.some(({ key }) => draft[key].trim());

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSave) return;

    const note: ResearchNote = {
      id: createId(),
      assetCode,
      assetType,
      createdAt: Date.now(),
      reason: draft.reason.trim(),
      observation: draft.observation.trim(),
      plan: draft.plan.trim(),
      risk: draft.risk.trim(),
    };
    const nextNotes = [...notes, note];
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
    setNotes(nextNotes);
    setDraft(emptyDraft());
  }

  function deleteNote(id: string) {
    if (!window.confirm("确定删除这条研究记录？")) return;

    const nextNotes = notes.filter((note) => note.id !== id);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextNotes));
    setNotes(nextNotes);
  }

  function exportNotes() {
    const backup: ResearchBackup = {
      version: 1,
      exportedAt: Date.now(),
      notes,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `myinvest-research-notes-${formatShanghaiTime(backup.exportedAt).slice(0, 10)}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  async function restoreNotes(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    let backup: ResearchBackup;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      if (!isResearchBackup(parsed)) throw new Error("Invalid research backup");
      backup = parsed;
    } catch {
      setRestoreError(true);
      return;
    }

    setRestoreError(false);
    if (!window.confirm("导入将用备份中的全部研究记录替换当前记录，确定继续？")) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(backup.notes));
    setNotes(backup.notes);
    setUnreadable(false);
  }

  return (
    <section className="research-notes" aria-labelledby="research-notes-title">
      <div className="section-heading">
        <h2 id="research-notes-title">个人研究记录</h2>
        <div className="research-notes-actions">
          <button
            className="research-notes-export"
            disabled={unreadable || notes.length === 0}
            onClick={exportNotes}
            type="button"
          >
            导出全部记录
          </button>
          <button
            className="research-notes-restore"
            onClick={() => restoreInputRef.current?.click()}
            type="button"
          >
            从备份恢复
          </button>
          <input
            accept="application/json,.json"
            className="research-notes-file-input"
            onChange={restoreNotes}
            ref={restoreInputRef}
            type="file"
          />
        </div>
      </div>
      {restoreError ? (
        <p className="research-note-error" role="alert">
          备份文件无效
        </p>
      ) : null}
      {unreadable ? (
        <p className="research-note-error" role="alert">
          研究记录暂不可读取
        </p>
      ) : (
        <form className="research-note-form" onSubmit={saveNote}>
          <div className="research-note-grid">
            {fields.map(({ key, label }) => (
              <label className="research-note-field" key={key}>
                <span className="label">{label}</span>
                <textarea
                  value={draft[key]}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      [key]: event.target.value,
                    }))
                  }
                />
              </label>
            ))}
          </div>
          <button className="research-note-save" disabled={!canSave} type="submit">
            保存研究记录
          </button>
        </form>
      )}
      <div className="section-heading research-timeline-heading">
        <h2>研究时间线</h2>
      </div>
      {unreadable ? null : assetNotes.length === 0 ? (
        <p className="scope-note">暂无研究记录</p>
      ) : (
        <div className="research-note-timeline">
          {assetNotes.map((note) => (
            <article className="research-note-item" key={note.id}>
              <div className="research-note-meta">
                <time className="label" dateTime={new Date(note.createdAt).toISOString()}>
                  {formatShanghaiTime(note.createdAt)}
                </time>
                <button
                  className="research-note-delete"
                  onClick={() => deleteNote(note.id)}
                  type="button"
                >
                  删除
                </button>
              </div>
              {fields.map(({ key, label }) =>
                note[key] ? (
                  <div className="research-note-content" key={key}>
                    <strong>{label}</strong>
                    <p>{note[key]}</p>
                  </div>
                ) : null,
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
