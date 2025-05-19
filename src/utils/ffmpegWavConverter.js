import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ffmpeg = null;
let ffmpegLoading = null;

// Use local files for offline support
const coreBaseURL = `${import.meta.env.BASE_URL}ffmpeg`;

export async function getFFmpeg() {
    if (!ffmpeg) {
        ffmpeg = new FFmpeg();
        ffmpegLoading = (async () => {
            await ffmpeg.load({
                coreURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.js`, "text/javascript"),
                wasmURL: await toBlobURL(`${coreBaseURL}/ffmpeg-core.wasm`, "application/wasm"),
            });
        })();
    }
    if (ffmpegLoading) {
        await ffmpegLoading;
        ffmpegLoading = null;
    }
    return ffmpeg;
}

export async function convertToWav(inputBlob) {
    const ffmpeg = await getFFmpeg();
    await ffmpeg.writeFile("input", await fetchFile(inputBlob));
    await ffmpeg.exec([
        "-i",
        "input",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-sample_fmt",
        "s16",
        "output.wav",
    ]);
    const data = await ffmpeg.readFile("output.wav");
    const wavBlob = new Blob([data.buffer], { type: "audio/wav" });
    await ffmpeg.deleteFile("input");
    await ffmpeg.deleteFile("output.wav");
    return wavBlob;
}
