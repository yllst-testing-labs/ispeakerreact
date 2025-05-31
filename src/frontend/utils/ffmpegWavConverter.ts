import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import isElectron from "./isElectron.js";

let ffmpeg: FFmpeg | null = null;
let ffmpegLoading: Promise<void> | null = null;

const getFFmpeg = async (): Promise<FFmpeg> => {
    if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpegLoading = (async () => {
            let coreURL, wasmURL;
            if (isElectron()) {
                const coreBaseURL = await window.electron.getFfmpegWasmPath();
                const jsPath = `${coreBaseURL}/ffmpeg-core.js`;
                const wasmPath = `${coreBaseURL}/ffmpeg-core.wasm`;
                coreURL = await window.electron.getFileAsBlobUrl(jsPath, "text/javascript");
                wasmURL = await window.electron.getFileAsBlobUrl(wasmPath, "application/wasm");
            }
            await ffmpeg.load({ coreURL, wasmURL });
        })();
    }
    if (ffmpegLoading) {
        await ffmpegLoading;
        ffmpegLoading = null;
    }
    return ffmpeg;
};

const convertToWav = async (inputBlob: Blob): Promise<Blob> => {
    const ffmpeg = await getFFmpeg();
    await ffmpeg.writeFile("input", await fetchFile(inputBlob));
    await ffmpeg.exec([
        "-i",
        "input",
        "-ar",
        "32000",
        "-ac",
        "1",
        "-sample_fmt",
        "s16",
        "-b:a",
        "96k",
        "output.wav",
    ]);
    const data = await ffmpeg.readFile("output.wav");
    const wavBlob = new Blob([data instanceof Uint8Array ? data : new Uint8Array([])], {
        type: "audio/wav",
    });
    await ffmpeg.deleteFile("input");
    await ffmpeg.deleteFile("output.wav");
    return wavBlob;
};

export default convertToWav;
