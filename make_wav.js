const fs = require("fs");
const sampleRate = 44100;
const numChannels = 2;
const duration = 10;
const numSamples = sampleRate * duration;
const blockAlign = numChannels * 2;
const byteRate = sampleRate * blockAlign;
const dataSize = numSamples * blockAlign;
const buffer = Buffer.alloc(44 + dataSize);

buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20); // PCM
buffer.writeUInt16LE(numChannels, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(byteRate, 28);
buffer.writeUInt16LE(blockAlign, 32);
buffer.writeUInt16LE(16, 34); // 16 bits
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

for (let i = 0; i < numSamples; i++) {
  const t = i / sampleRate;
  const sample = Math.sin(2 * Math.PI * 440 * t) * 0.3;
  const val = Math.round(sample * 32767);
  buffer.writeInt16LE(val, 44 + i * blockAlign);
  buffer.writeInt16LE(val, 44 + i * blockAlign + 2);
}

fs.writeFileSync("C:/Users/mohda/.gemini/antigravity-ide/brain/e9514ceb-5b54-4d80-aab1-9910c32fdf52/test_audio.wav", buffer);
console.log("WAV created successfully");
