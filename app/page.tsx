"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { gaEvent } from "@/app/lib/gtag";



type Mode = "today" | "tomorrow" | "everyDay" | "everyWeek" | "inDays";

const WEEKDAYS = [
  { label: "月", value: "monday" },
  { label: "火", value: "tuesday" },
  { label: "水", value: "wednesday" },
  { label: "木", value: "thursday" },
  { label: "金", value: "friday" },
  { label: "土", value: "saturday" },
  { label: "日", value: "sunday" },
] as const;


function isValidTime24h(t: string) {
  // HH:MM (00:00 - 23:59)
  return /^([01]\d|2[0-3]):([0-5]\d)$/.test(t);
}

export default function Page() {
  const [destination, setDestination] = useState("me");
  const [text, setText] = useState("");
  const [mode, setMode] = useState<Mode>("tomorrow");

  const [time, setTime] = useState("09:00");
  const [weekday, setWeekday] = useState<(typeof WEEKDAYS)[number]["value"]>("monday");
  const [days, setDays] = useState(3);

  const [copied, setCopied] = useState(false);

  const condition = useMemo(() => {
    if (!isValidTime24h(time)) return null;

    switch (mode) {
      case "today":
        return `today at ${time}`;
      case "tomorrow":
        return `tomorrow at ${time}`;
      case "everyDay":
        return `every day at ${time}`;
      case "everyWeek":
        return `every ${weekday} at ${time}`;
      case "inDays":
        if (!(days >= 1 && days <= 30)) return null;
        return `in ${days} days at ${time}`;
      default:
        return null;
    }
  }, [mode, time, weekday, days]);

  const command = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return "";
    if (!condition) return "";
    // ダブルクォートはエスケープ（簡易）
    return `/remind ${destination} "${safe}" ${condition}`;
  }, [text, condition, destination]);

  const canGenerate = command.length > 0;

async function onCopy() {
  if (!canGenerate) return;

  gaEvent("copy_command", {
    mode,
    destination_type: getDestinationType(destination),
  });

  try {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  } catch (e) {
    gaEvent("copy_command_failed", { mode });
  }
}

function onClear() {
  gaEvent("clear_form");

  setText("");
  setMode("tomorrow");
  setTime("09:00");
  setWeekday("monday");
  setDays(3);
  setCopied(false);
}

function getDestinationType(dest: string) {
  if (dest === "me") return "me";
  if (dest.startsWith("#")) return "channel";
  if (dest.startsWith("@")) return "user";
  return "other";
}

const prevCanGenerate = useRef(false);

useEffect(() => {
  if (!prevCanGenerate.current && canGenerate) {
    gaEvent("command_ready", {
      mode,
      destination_type: getDestinationType(destination),
      has_multiline: text.includes("\n"),
      message_length: text.trim().length,
    });
  }
  prevCanGenerate.current = canGenerate;
}, [canGenerate, mode, destination, text]);

  return (
    <main style={{ maxWidth: 720, margin: "40px auto", padding: "0 16px", fontFamily: "system-ui" }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 12 }}>Slack Remind Command Generator</h1>
      <p>
        考えずに使える Slack リマインド。
        入力するだけで <code>/remind</code> コマンドを生成します。
      </p>

      <section style={{ display: "grid", gap: 12, marginTop: 18 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>リマインド先</span>
          <input
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="me / #general / @username"
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>リマインド文言</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="例：日報を書く\n・KPTを書く\n・共有する"
              style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
            />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>リマインド条件</span>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
          >
            <option value="today">今日 HH:MM</option>
            <option value="tomorrow">明日 HH:MM</option>
            <option value="everyDay">毎日 HH:MM</option>
            <option value="everyWeek">毎週（曜日）HH:MM</option>
            <option value="inDays">X日後 HH:MM</option>
          </select>
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>時刻（24時間）</span>
            <input
              value={time}
              onChange={(e) => setTime(e.target.value)}
              placeholder="09:00"
              inputMode="numeric"
              style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
            />
            {!isValidTime24h(time) && <span style={{ color: "crimson", fontSize: 12 }}>HH:MM（00:00〜23:59）</span>}
          </label>

          {mode === "everyWeek" && (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>曜日</span>
              <select
                value={weekday}
                onChange={(e) => setWeekday(e.target.value as any)}
                style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
              >
                {WEEKDAYS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          {mode === "inDays" && (
            <label style={{ display: "grid", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>X（日後）</span>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8 }}
              >
                {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600 }}>生成されたコマンド</span>
          <textarea
            value={command}
            readOnly
            rows={3}
            style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
            placeholder='ここに生成されます'
          />
        </label>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCopy}
            disabled={!canGenerate}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: canGenerate ? "#111" : "#eee",
              color: canGenerate ? "#fff" : "#999",
              cursor: canGenerate ? "pointer" : "not-allowed",
            }}
          >
            {copied ? "コピーしました" : "コピー"}
          </button>

          <button
            onClick={onClear}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #ccc",
              background: "#fff",
              cursor: "pointer",
            }}
          >
            クリア
          </button>
        </div>
      </section>

      <hr style={{ margin: "24px 0" }} />
      <p style={{ color: "#666", fontSize: 13 }}>
        生成したコマンドをSlackに貼り付けて実行してください。Slack側の解釈に依存するため、環境によっては表現の微調整が必要な場合があります。
      </p>
    </main>
  );
}
