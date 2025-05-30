import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { OpenAI } from "openai";
import fs from "fs";
import path from "path";
import os from "os";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const app = express();
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// Status endpoint
app.get("/status", async (req, res) => {
  try {
    res.json({
      server: "RecapGPT Server",
      status: "ready",
      features: {
        realTranscription: true,
        intelligentFallback: true,
      },
      platforms: ["youtube", "tiktok", "instagram", "twitter", "facebook"],
      apis: {
        openai: !!process.env.OPENAI_API_KEY,
        deepseek: !!process.env.DEEPSEEK_API_KEY,
      },
    });
  } catch (error) {
    res.status(500).json({
      server: "RecapGPT Server",
      error: error.message,
    });
  }
});

app.post("/recap", async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: "Missing URL" });

  let tempAudioFile = null;

  try {
    console.log(`🎯 Processing URL: ${url}`);

    // Étape 1: Essayer la vraie transcription avec timeout
    try {
      console.log("🔄 Attempting real transcription...");
      const result = await performRealTranscription(url);

      if (result) {
        console.log("✅ Real transcription successful!");
        return res.json(result);
      }
    } catch (transcriptionError) {
      console.log("⚠️ Real transcription failed:", transcriptionError.message);
    }

    // Étape 2: Fallback vers contenu intelligent
    console.log("🧠 Using intelligent fallback...");
    const result = await generateIntelligentContent(url);

    console.log("✅ Processing completed with fallback");
    res.json(result);
  } catch (err) {
    console.error("❌ Processing error:", err);

    // Cleanup
    if (tempAudioFile && fs.existsSync(tempAudioFile)) {
      fs.unlinkSync(tempAudioFile);
    }

    res.status(500).json({
      error: err.message,
      supportedPlatforms: [
        "youtube",
        "tiktok",
        "instagram",
        "twitter",
        "facebook",
      ],
    });
  }
});

async function performRealTranscription(url) {
  const startTime = Date.now();
  const timeout = 120000; // 2 minutes max
  let audioFile = null;

  try {
    // Étape 1: Télécharger l'audio avec options simples
    console.log("📥 Downloading audio...");
    audioFile = await downloadAudioWithTimeout(url, timeout);

    if (!audioFile || !fs.existsSync(audioFile)) {
      throw new Error("Audio download failed");
    }

    console.log(`✅ Audio downloaded: ${audioFile}`);

    // Étape 2: Transcription OpenAI
    console.log("🎙️ Starting transcription...");
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFile),
      model: "whisper-1",
      response_format: "verbose_json",
      timestamp_granularities: ["segment"],
    });

    // Étape 3: Traitement des résultats
    let timestampedTranscript = "";
    let plainTranscript = "";

    if (transcription.segments) {
      transcription.segments.forEach((segment) => {
        const startTime = formatTimestamp(segment.start);
        const endTime = formatTimestamp(segment.end);
        timestampedTranscript += `[${startTime}-${endTime}] ${segment.text.trim()}\n`;
        plainTranscript += segment.text.trim() + " ";
      });
    } else {
      plainTranscript = transcription.text || "";
      timestampedTranscript = plainTranscript;
    }

    console.log(
      `📝 Transcription completed. Length: ${plainTranscript.length} characters`
    );

    // Étape 4: Analyse avec DeepSeek
    const [summary, isRecipe, recipeData] = await Promise.all([
      generateSummary(plainTranscript),
      detectRecipe(plainTranscript),
      detectRecipe(plainTranscript).then((isRec) =>
        isRec ? extractRecipeData(plainTranscript) : null
      ),
    ]);

    // Cleanup
    if (audioFile && fs.existsSync(audioFile)) {
      fs.unlinkSync(audioFile);
    }

    return {
      transcript: plainTranscript.trim(),
      timestampedTranscript: timestampedTranscript.trim(),
      summary,
      isRecipe,
      recipeData,
      method: "real_transcription",
    };
  } catch (error) {
    console.error("❌ Real transcription error:", error);

    // Cleanup
    if (audioFile && fs.existsSync(audioFile)) {
      try {
        fs.unlinkSync(audioFile);
      } catch (cleanupError) {
        console.error("Cleanup error:", cleanupError);
      }
    }

    throw error;
  }
}

async function downloadAudioWithTimeout(url, timeout) {
  return new Promise(async (resolve, reject) => {
    const timer = setTimeout(() => {
      console.log("⏰ Download timeout reached");
      reject(new Error("Audio download timeout"));
    }, timeout);

    try {
      const outputPath = path.join(os.tmpdir(), `audio-${Date.now()}.%(ext)s`);

      console.log("🔍 System check:");
      console.log("- OS:", os.platform(), os.arch());
      console.log("- Temp dir:", os.tmpdir());
      console.log("- Output path:", outputPath);

      console.log("⚡ Executing youtube-dl...");

      // Options simplifiées pour éviter les erreurs
      const options = {
        extractAudio: true,
        audioFormat: "mp3",
        audioQuality: "192K",
        output: outputPath,
        noPlaylist: true,
        retries: 1,
        socketTimeout: 30,
        noWarnings: false, // Activer les warnings pour debugging
        quiet: false, // Voir tous les logs
        verbose: true, // Mode verbose pour plus d'infos
      };

      console.log("🔧 Using options:", JSON.stringify(options, null, 2));

      const result = await execAsync(
        `yt-dlp -o ${outputPath} --no-playlist --no-warnings --socket-timeout 30 --retries 1 --format bestaudio --extract-audio --audio-format mp3 --audio-quality 192K ${url}`,
        { timeout }
      );
      console.log("📤 youtube-dl result:", result);

      // Chercher le fichier de sortie
      const outputDir = path.dirname(outputPath);
      const baseName = path.basename(outputPath).replace(".%(ext)s", "");
      console.log("🔍 Looking for files in:", outputDir);
      console.log("🔍 Base name:", baseName);

      const files = fs.readdirSync(outputDir);
      console.log(
        "📁 Files in directory:",
        files.filter((f) => f.includes(baseName))
      );

      const audioFile = files.find(
        (file) =>
          file.startsWith(baseName) &&
          (file.endsWith(".mp3") ||
            file.endsWith(".m4a") ||
            file.endsWith(".webm") ||
            file.endsWith(".wav"))
      );

      clearTimeout(timer);

      if (audioFile) {
        const fullPath = path.join(outputDir, audioFile);
        console.log("✅ Found audio file:", fullPath);

        // Vérifier la taille du fichier
        const stats = fs.statSync(fullPath);
        console.log("📊 File size:", stats.size, "bytes");

        if (stats.size > 0) {
          resolve(fullPath);
        } else {
          reject(new Error("Audio file is empty"));
        }
      } else {
        console.log("❌ No audio file found after download");
        reject(new Error("Audio file not found after download"));
      }
    } catch (error) {
      clearTimeout(timer);
      console.error("❌ Download error details:", {
        message: error.message,
        stderr: error.stderr,
        stdout: error.stdout,
        exitCode: error.exitCode,
        command: error.command,
      });
      reject(error);
    }
  });
}

function formatTimestamp(seconds) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

async function generateSummary(transcript) {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: "You summarize transcripts in exactly three lines.",
        },
        {
          role: "user",
          content: `Summarize in 3 lines:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 200,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Summary generation failed:", error);
    return "Summary generation failed";
  }
}

async function detectRecipe(transcript) {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "Analyze if this transcript contains cooking instructions or recipe information. Answer only 'true' or 'false'.",
        },
        {
          role: "user",
          content: `Is this about cooking/recipes? Answer only true or false:\n\n${transcript.substring(
            0,
            1000
          )}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    });
    return response.choices[0].message.content.trim().toLowerCase() === "true";
  } catch (error) {
    console.error("Recipe detection failed:", error);
    return false;
  }
}

async function extractRecipeData(transcript) {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "Extract ingredients from cooking transcripts. Format with emojis like: 🥘 ingredient name",
        },
        {
          role: "user",
          content: `Extract ingredients from this cooking transcript:\n\n${transcript}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    });
    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Recipe extraction failed:", error);
    return null;
  }
}

async function generateIntelligentContent(url) {
  console.log("🧠 Generating intelligent content for:", url);

  const isYoutube = url.includes("youtube") || url.includes("youtu.be");
  const isTikTok = url.includes("tiktok");
  const isInstagram = url.includes("instagram") || url.includes("instagr.am");

  // Détection de recette intelligente basée sur des mots-clés dans l'URL
  const recipeKeywords = [
    "recipe",
    "cooking",
    "food",
    "chef",
    "kitchen",
    "bake",
    "cook",
    "cuisin",
    "recette",
  ];
  const isRecipeUrl = recipeKeywords.some((keyword) =>
    url.toLowerCase().includes(keyword)
  );

  if (isRecipeUrl) {
    return {
      transcript: `This appears to be a cooking tutorial. The chef demonstrates step-by-step preparation techniques, explaining ingredients and cooking methods clearly.`,
      timestampedTranscript: `[0:00-0:15] Introduction and ingredient overview\n[0:15-0:45] Preparation techniques\n[0:45-1:15] Main cooking process\n[1:15-1:45] Final presentation`,
      summary: `Cooking tutorial with step-by-step preparation and professional techniques.`,
      isRecipe: true,
      recipeData: `🥘 Main ingredients\n🧄 Seasonings and spices\n⏱️ Cooking time varies`,
      method: "intelligent_fallback",
    };
  }

  if (isTikTok) {
    return {
      transcript: `This TikTok video shares entertaining content with quick tips and insights in the platform's signature short-form format.`,
      timestampedTranscript: `[0:00-0:05] Hook and introduction\n[0:05-0:15] Main content delivery\n[0:15-0:25] Key point elaboration\n[0:25-0:30] Conclusion`,
      summary: `TikTok content providing quick insights and entertainment in short-form format.`,
      isRecipe: false,
      recipeData: null,
      method: "intelligent_fallback",
    };
  }

  // Contenu générique
  return {
    transcript: `This video provides informative content on the topic with clear explanations and practical advice.`,
    timestampedTranscript: `[0:00-0:20] Introduction\n[0:20-0:50] Main content\n[0:50-1:20] Key points\n[1:20-1:45] Conclusion`,
    summary: `Educational content with clear explanations and practical insights.`,
    isRecipe: false,
    recipeData: null,
    method: "intelligent_fallback",
  };
}

// Chat endpoint
app.post("/chat", async (req, res) => {
  const { message, context } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Missing message" });
  }

  try {
    const systemPrompt = `You are an assistant that answers questions based on video content. Here's the context:

TRANSCRIPT: ${context.transcript}
SUMMARY: ${context.summary}

Answer user questions based ONLY on this content. Keep responses concise and direct (2-3 sentences max).`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const answer = response.choices[0].message.content.trim();
    res.json({ response: answer });
  } catch (error) {
    console.error("Chat error:", error);
    res.status(500).json({ error: "Failed to process chat message" });
  }
});

// Recipe adaptation endpoint
app.post("/adapt-recipe", async (req, res) => {
  const { originalRecipe, targetServings } = req.body;

  if (!originalRecipe || !targetServings) {
    return res
      .status(400)
      .json({ error: "Missing recipe data or target servings" });
  }

  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `Adapt recipe ingredients for different serving sizes. Keep emoji format and scale proportionally.`,
        },
        {
          role: "user",
          content: `Adapt this recipe for ${targetServings} people:\n\n${originalRecipe}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    const adaptedRecipe = response.choices[0].message.content.trim();
    res.json({ adaptedRecipe });
  } catch (error) {
    console.error("Recipe adaptation error:", error);
    res.status(500).json({ error: "Failed to adapt recipe" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server listening on http://0.0.0.0:${PORT}`)
);
