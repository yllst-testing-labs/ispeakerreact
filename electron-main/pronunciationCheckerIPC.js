import { ipcMain } from "electron";
import { getSaveFolder, readUserSettings } from "./filePath.js";
import path from "node:path";
import * as fsPromises from "node:fs/promises";
import applog from "electron-log";
import { spawn } from "child_process";

const startProcess = (cmd, args) => {
    const proc = spawn(cmd, args, { shell: true });
    return proc;
};

// IPC handler to check pronunciation
const setupPronunciationCheckerIPC = () => {
    ipcMain.handle("pronunciation-check", async (event, audioPath) => {
        const saveFolder = await getSaveFolder(readUserSettings);
        const modelDir = path.join(saveFolder, "phoneme-model");
        const logFilePath = path.join(saveFolder, "pronunciation_checker.log").replace(/\\/g, "/");
        applog.info(`[PronunciationChecker] audioPath: ${audioPath}`);
        applog.info(`[PronunciationChecker] modelDir: ${modelDir}`);
        // Robust Python script for model inference
        const pyCode = `import os
import sys
import json
import torch
import torchaudio
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

LOG_PATH = r'${logFilePath}'
MODEL_DIR = r"""${modelDir}"""
AUDIO_PATH = r"""${audioPath}"""

def log_json(obj):
    msg = json.dumps(obj)
    pretty = json.dumps(obj, indent=2, ensure_ascii=False)
    print(msg)
    print(pretty, file=sys.stderr)
    try:
        with open(LOG_PATH, 'a', encoding='utf-8') as f:
            f.write(pretty + '\\n')
    except Exception as log_exc:
        print(f"Failed to write log: {log_exc}", file=sys.stderr)

def main():
    try:
        log_json({"status": "progress", "message": "Loading processor..."})
        processor = Wav2Vec2Processor.from_pretrained(MODEL_DIR)
        log_json({"status": "progress", "message": "Loading model..."})
        model = Wav2Vec2ForCTC.from_pretrained(MODEL_DIR).to("cpu")
        log_json({"status": "progress", "message": "Model loaded."})

        log_json({"status": "progress", "message": f"Loading audio: {AUDIO_PATH}"})
        waveform, sample_rate = torchaudio.load(AUDIO_PATH)
        log_json({"status": "progress", "message": f"Audio loaded. Sample rate: {sample_rate}"})

        if sample_rate != 16000:
            log_json({"status": "progress", "message": f"Resampling from {sample_rate} to 16000..."})
            resampler = torchaudio.transforms.Resample(orig_freq=sample_rate, new_freq=16000)
            waveform = resampler(waveform)
        waveform = waveform.mean(dim=0, keepdim=True)
        log_json({"status": "progress", "message": f"Waveform shape: {waveform.shape}, dtype: {waveform.dtype}"})

        log_json({"status": "progress", "message": "Preparing inputs for model..."})
        inputs = processor(waveform.squeeze().numpy(), sampling_rate=16000, return_tensors="pt")
        log_json({"status": "progress", "message": f"Input tensor shape: {inputs['input_values'].shape}, dtype: {inputs['input_values'].dtype}"})

        log_json({"status": "progress", "message": "Running model..."})
        with torch.no_grad():
            logits = model(**inputs).logits
        log_json({"status": "progress", "message": "Model run complete."})

        predicted_ids = torch.argmax(logits, dim=-1)
        transcription = processor.batch_decode(predicted_ids)
        result = transcription[0].strip()
        if result == "":
            log_json({"status": "success", "phonemes": None, "message": "No phonemes detected."})
            print(json.dumps({"status": "success", "phonemes": None, "message": "No phonemes detected."}))
        else:
            log_json({"status": "success", "phonemes": result})
            print(json.dumps({"status": "success", "phonemes": result}))

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        log_json({"status": "error", "message": str(e), "traceback": tb})
        sys.exit(1)

if __name__ == "__main__":
    main()
`;
        const tempPyPath = path.join(saveFolder, "pronunciation_checker_temp.py");
        await fsPromises.writeFile(tempPyPath, pyCode, "utf-8");
        applog.info(`[PronunciationChecker] tempPyPath: ${tempPyPath}`);
        applog.info(`[PronunciationChecker] About to run: python -u ${tempPyPath}`);
        return new Promise((resolve) => {
            const py = startProcess("python", ["-u", tempPyPath], (err) => {
                fsPromises.unlink(tempPyPath).catch(() => {
                    console.warn("Failed to delete temp pronunciation checker file");
                });
                if (err) {
                    applog.error(
                        `[PronunciationChecker] Python process exited with code: ${err.code}`
                    );
                }
            });
            let lastJson = null;
            py.stdout.on("data", (data) => {
                const lines = data.toString().split(/\r?\n/);
                for (const line of lines) {
                    if (line.trim().startsWith("{") && line.trim().endsWith("}")) {
                        try {
                            lastJson = JSON.parse(line.trim());
                        } catch {
                            console.error(`[PronunciationChecker] Failed to parse JSON: ${line.trim()}`);
                        }
                    }
                }
                applog.info(`[PronunciationChecker][stdout] ${data.toString()}`);
            });
            py.stderr.on("data", (data) => {
                applog.info(`[PronunciationChecker][stderr] ${data.toString()}`);
            });
            py.on("close", (code) => {
                applog.info(`[PronunciationChecker] Python process closed with code: ${code}`);
                if (lastJson) {
                    resolve(lastJson);
                } else {
                    resolve({ status: code === 0 ? "success" : "error", code });
                }
            });
        });
    });
};

// IPC handler to get the recording blob for a given key
const setupGetRecordingBlobIPC = () => {
    ipcMain.handle("get-recording-blob", async (_event, key) => {
        const saveFolder = await getSaveFolder(readUserSettings);
        const filePath = path.join(saveFolder, "saved_recordings", `${key}.wav`);
        try {
            const data = await fsPromises.readFile(filePath);
            return data.buffer; // ArrayBuffer for renderer
        } catch (err) {
            throw new Error(`Failed to read recording: ${err.message}`);
        }
    });
};

export { setupPronunciationCheckerIPC, setupGetRecordingBlobIPC };
