const express = require("express");
const fs = require("fs");
const path = require("path");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const { v4: uuidv4 } = require("uuid");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(express.json({ limit: "50mb" }));

app.post("/convert", async (req, res) => {
  try {
    const base64Data = req.body.base64;

    if (!base64Data || !base64Data.startsWith("data:audio")) {
      return res.status(400).json({ error: "Base64 inválido" });
    }

    // Remove o prefixo data:audio/mpeg;base64,
    const buffer = Buffer.from(base64Data.split(",")[1], "base64");

    const inputPath = `/tmp/${uuidv4()}.mp3`;
    const outputPath = `/tmp/${uuidv4()}_converted.mp3`;

    // Salva o áudio original
    fs.writeFileSync(inputPath, buffer);

    // Reencoda com ffmpeg
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioChannels(1)           // mono
        .audioFrequency(44100)      // 44.1 kHz
        .audioBitrate("64k")        // 64kbps
        .format("mp3")              // mp3 padrão
        .output(outputPath)
        .on("end", resolve)
        .on("error", reject)
        .run();
    });

    // Lê o áudio convertido
    const converted = fs.readFileSync(outputPath);
    const base64Converted = `data:audio/mpeg;base64,${converted.toString("base64")}`;

    // Limpa os arquivos temporários
    fs.unlinkSync(inputPath);
    fs.unlinkSync(outputPath);

    // Retorna o base64 convertido
    res.json({ base64: base64Converted });

  } catch (error) {
    console.error("Erro na conversão:", error);
    res.status(500).json({ error: "Falha na conversão do áudio" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Conversor de áudio rodando na porta ${PORT}`);
});

app.get("/", (req, res) => {
  res.send("✅ API de conversão de áudio ativa!");
});
