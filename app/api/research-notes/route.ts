import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";

import {
  addResearchNote,
  deleteResearchNote,
  listResearchNotes,
  replaceResearchNotes,
  type AssetType,
  type ResearchNote,
} from "../../../lib/research-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const fields = ["reason", "observation", "plan", "risk"] as const;

function isAssetType(value: unknown): value is AssetType {
  return value === "a-share" || value === "fund-etf";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function readText(value: unknown): string | undefined {
  return typeof value === "string" ? value.trim() : undefined;
}

function isResearchNote(value: unknown): value is ResearchNote {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.assetCode === "string" &&
    isAssetType(value.assetType) &&
    typeof value.createdAt === "number" &&
    Number.isFinite(value.createdAt) &&
    fields.every((field) => typeof value[field] === "string")
  );
}

function badRequest(message: string) {
  return Response.json({ error: message }, { status: 400 });
}

export async function GET() {
  try {
    return Response.json({ notes: await listResearchNotes() });
  } catch {
    return Response.json({ error: "研究记录暂不可读取" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return badRequest("请求内容无效");
  }

  if (!isRecord(body)) return badRequest("请求内容无效");

  if (body.action === "replace-all") {
    if (!Array.isArray(body.notes) || !body.notes.every(isResearchNote)) {
      return badRequest("备份记录无效");
    }

    const notes = body.notes;
    if (new Set(notes.map((note) => note.id)).size !== notes.length) {
      return badRequest("备份记录存在重复标识");
    }

    try {
      await replaceResearchNotes(notes);
      return Response.json({ notes: await listResearchNotes() });
    } catch {
      return Response.json({ error: "研究记录暂不可恢复" }, { status: 500 });
    }
  }

  const assetCode = readText(body.assetCode);
  if (!assetCode || !isAssetType(body.assetType)) {
    return badRequest("标的无效");
  }

  const draft = Object.fromEntries(
    fields.map((field) => [field, readText(body[field])]),
  ) as Record<(typeof fields)[number], string | undefined>;
  if (fields.some((field) => draft[field] === undefined) || !fields.some((field) => draft[field])) {
    return badRequest("研究内容无效");
  }

  const note: ResearchNote = {
    id: randomUUID(),
    assetCode,
    assetType: body.assetType,
    createdAt: Date.now(),
    reason: draft.reason ?? "",
    observation: draft.observation ?? "",
    plan: draft.plan ?? "",
    risk: draft.risk ?? "",
  };

  try {
    await addResearchNote(note);
    return Response.json({ note }, { status: 201 });
  } catch {
    return Response.json({ error: "研究记录暂不可保存" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return badRequest("记录标识不能为空");

  try {
    await deleteResearchNote(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "研究记录暂不可删除" }, { status: 500 });
  }
}
