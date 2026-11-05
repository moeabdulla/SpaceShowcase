import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  generateNarration,
  pcmToWav,
  NARRATION_MODEL,
} from "../lib/narration.js";

class FakeSocket extends EventEmitter {
  static last;
  constructor(url) {
    super();
    this.url = url;
    this.readyState = 1;
    this.sent = [];
    FakeSocket.last = this;
  }
  send(value) {
    this.sent.push(JSON.parse(value));
  }
  close() {
    this.readyState = 3;
    this.emit("close");
  }
  terminate() {
    this.close();
  }
  message(event) {
    this.emit("message", Buffer.from(JSON.stringify(event)));
  }
}
const start = (options = {}) =>
  generateNarration({
    apiKey: "test-only",
    title: "Saturn",
    explanation: "Saturn has rings.",
    Socket: FakeSocket,
    ...options,
  });

test("WAV encodes mono 24kHz PCM with correct length", () => {
  const wav = pcmToWav(Buffer.alloc(48000));
  assert.equal(wav.toString("ascii", 0, 4), "RIFF");
  assert.equal(wav.toString("ascii", 8, 12), "WAVE");
  assert.equal(wav.readUInt32LE(24), 24000);
  assert.equal(wav.readUInt32LE(40), 48000);
  assert.equal(wav.length, 48044);
});
test("one Realtime Mini request produces reusable audio and closes connection", async () => {
  const promise = start();
  const ws = FakeSocket.last;
  assert.match(ws.url, new RegExp(NARRATION_MODEL.replaceAll(".", "\\.")));
  ws.message({ type: "session.created" });
  assert.equal(ws.sent[0].session.audio.output.voice, "cedar");
  ws.message({ type: "session.updated" });
  assert.deepEqual(
    ws.sent.map((e) => e.type),
    ["session.update", "conversation.item.create", "response.create"],
  );
  ws.message({
    type: "response.output_audio.delta",
    delta: Buffer.alloc(48000).toString("base64"),
  });
  ws.message({
    type: "response.output_audio_transcript.delta",
    delta: "Saturn has rings.",
  });
  ws.message({ type: "response.done", response: { status: "completed" } });
  const result = await promise;
  assert.equal(result.audio.length, 48044);
  assert.equal(result.transcript, "Saturn has rings.");
  assert.equal(ws.readyState, 3);
});
test("failed or incomplete generation never returns a corrupt audio file", async () => {
  const promise = start();
  FakeSocket.last.message({
    type: "response.done",
    response: { status: "failed" },
  });
  await assert.rejects(promise, /did not complete/);
});
test("request cancellation and timeout close upstream connection", async () => {
  const controller = new AbortController();
  const aborted = start({ signal: controller.signal });
  controller.abort();
  await assert.rejects(aborted, /cancelled/);
  assert.equal(FakeSocket.last.readyState, 3);
  await assert.rejects(start({ timeoutMs: 5 }), /timed out/);
  assert.equal(FakeSocket.last.readyState, 3);
});
test("audio length cap stops runaway generation", async () => {
  const promise = start();
  FakeSocket.last.message({
    type: "response.output_audio.delta",
    delta: Buffer.alloc(24000 * 2 * 41).toString("base64"),
  });
  await assert.rejects(promise, /length limit/);
});
