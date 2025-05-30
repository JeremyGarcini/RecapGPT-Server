import dotenv from "dotenv";
dotenv.config();

import { OpenAI } from "openai";
import readline from "readline";

const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com",
});

// Interface readline pour l'interaction
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Stockage du contexte de la recap
let recapContext = {
  transcript: "",
  timestampedTranscript: "",
  summary: "",
  isLoaded: false,
  isRecipe: false,
  recipeData: null,
};

// Fonction pour obtenir une recap depuis l'API
async function getRecap(url) {
  try {
    console.log(`🔄 Generating recap for: ${url}`);
    console.log("⏳ This may take a moment...\n");

    const response = await fetch("http://localhost:3000/recap", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("❌ Error retrieving recap:", error.message);
    return null;
  }
}

// Fonction pour détecter si c'est une recette de cuisine
async function detectRecipe(transcript, summary) {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a recipe detection assistant. Analyze the content and determine if it contains cooking instructions or recipe information.

Respond with ONLY "YES" if the content contains:
- Cooking ingredients with quantities
- Food preparation steps
- Cooking instructions
- Recipe demonstrations

Respond with ONLY "NO" if it's about anything else.`,
        },
        {
          role: "user",
          content: `TRANSCRIPT: ${transcript}\n\nSUMMARY: ${summary}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 10,
    });

    const result = response.choices[0].message.content.trim().toUpperCase();
    return result === "YES";
  } catch (error) {
    console.error("❌ Error detecting recipe:", error.message);
    return false;
  }
}

// Fonction pour extraire les ingrédients d'une recette
async function extractRecipeIngredients(transcript, timestampedTranscript) {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a recipe extraction assistant. Extract all ingredients mentioned with their quantities and add appropriate food emojis.

Format each ingredient like this:
🥔 2 potatoes
🧄 3 cloves garlic
🧂 1 tsp salt

Use relevant emojis for each ingredient. If no specific quantity is mentioned, write "to taste" or "as needed". Include timing references when available from timestamps.

Keep the response concise and organized.`,
        },
        {
          role: "user",
          content: `Extract ingredients from this cooking content:\n\nTRANSCRIPT WITH TIMESTAMPS:\n${
            timestampedTranscript || transcript
          }`,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Error extracting recipe:", error.message);
    return null;
  }
}

// Fonction pour adapter les quantités pour un nombre de personnes
async function adaptRecipePortions(
  originalRecipe,
  targetServings,
  originalServings = null
) {
  try {
    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are a recipe scaling assistant. Adapt ingredient quantities for a different number of servings.

IMPORTANT: Keep the same emoji format as the original recipe. Scale all quantities proportionally. If the original servings aren't specified, assume it's for 2-3 people.

For each ingredient, calculate the new quantity and maintain the emoji format:
🥔 4 potatoes (scaled from 2)
🧄 6 cloves garlic (scaled from 3)

Be practical with measurements (round to reasonable amounts).`,
        },
        {
          role: "user",
          content: `Original recipe ingredients:
${originalRecipe}

Please adapt this recipe for ${targetServings} people.${
            originalServings
              ? ` Original was for ${originalServings} people.`
              : ""
          }`,
        },
      ],
      temperature: 0.3,
      max_tokens: 400,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("❌ Error adapting recipe:", error.message);
    return null;
  }
}

// Fonction pour poser une question sur la recap
async function askQuestion(question) {
  if (!recapContext.isLoaded) {
    console.log("❌ No recap loaded. Please restart and provide a URL.\n");
    return;
  }

  // Détecter si c'est une question d'adaptation de recette
  const portionMatch = question.match(
    /(\d+)\s*(person|people|pers|personnes)/i
  );
  if (recapContext.isRecipe && portionMatch && recapContext.recipeData) {
    const targetServings = parseInt(portionMatch[1]);
    console.log(`🧮 Adapting recipe for ${targetServings} people...`);

    const adaptedRecipe = await adaptRecipePortions(
      recapContext.recipeData,
      targetServings
    );
    if (adaptedRecipe) {
      console.log(`\n👨‍🍳 Recipe adapted for ${targetServings} people:\n`);
      console.log(adaptedRecipe);
      console.log("");
      return;
    }
  }

  try {
    console.log("🤔 Thinking...");

    const systemPrompt = recapContext.isRecipe
      ? `You are an assistant that answers questions based on cooking/recipe video content. Here's the context:

FULL TRANSCRIPT WITH TIMESTAMPS:
${recapContext.timestampedTranscript || recapContext.transcript}

SUMMARY:
${recapContext.summary}

EXTRACTED RECIPE:
${recapContext.recipeData || "No recipe data"}

Answer user questions based ONLY on this content. For cooking questions, provide practical advice. When possible, reference specific timestamps. If the answer is not in the provided content, say so clearly. Keep responses concise and direct (2-3 sentences max). You can respond in any language that best matches the user's question or the content language.`
      : `You are an assistant that answers questions based on video content. Here's the context:

FULL TRANSCRIPT WITH TIMESTAMPS:
${recapContext.timestampedTranscript || recapContext.transcript}

SUMMARY:
${recapContext.summary}

Answer user questions based ONLY on this content. When possible, reference the specific timestamp where information was mentioned (e.g., "At 0:32, the speaker mentions..." or "Around 1:18-1:24..."). If the answer is not in the provided content, say so clearly. Keep responses concise and direct (2-3 sentences max). You can respond in any language that best matches the user's question or the content language.`;

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: question,
        },
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const answer = response.choices[0].message.content.trim();
    console.log(`\n💬 ${answer}\n`);
  } catch (error) {
    console.error("❌ Error generating response:", error.message);
  }
}

// Fonction pour charger une recap et démarrer le chat
async function loadRecapAndChat(url) {
  const recap = await getRecap(url);

  if (!recap) {
    console.log(
      "❌ Failed to generate recap. Please check the URL and try again."
    );
    rl.close();
    return;
  }

  // Charger la recap
  recapContext = {
    transcript: recap.transcript,
    timestampedTranscript: recap.timestampedTranscript || "",
    summary: recap.summary,
    isLoaded: true,
    isRecipe: false,
    recipeData: null,
  };

  console.log("✅ Recap generated successfully!");
  console.log(`📋 Summary: ${recap.summary}`);
  if (recap.timestampedTranscript) {
    console.log("⏱️ Timestamps: Available");
  }

  // Détecter si c'est une recette
  console.log("🔍 Checking if this is a cooking video...");
  const isRecipe = await detectRecipe(recap.transcript, recap.summary);

  if (isRecipe) {
    recapContext.isRecipe = true;
    console.log("👨‍🍳 Cooking content detected! Extracting recipe...");

    const recipeData = await extractRecipeIngredients(
      recap.transcript,
      recap.timestampedTranscript
    );

    if (recipeData) {
      recapContext.recipeData = recipeData;
      console.log("\n🍽️ RECIPE INGREDIENTS DETECTED:\n");
      console.log(recipeData);
      console.log("\n💡 You can ask questions like:");
      console.log("  - 'I want this for 4 people, how do I adapt it?'");
      console.log("  - 'What's the cooking time?'");
      console.log("  - 'At what temperature should I cook this?'");
    }
  }

  console.log("\n🎯 Ask any questions about the video!");
  if (!isRecipe) {
    console.log("💡 Try questions like:");
    console.log("  - 'Where did you hear about X?'");
    console.log("  - 'At what time does he mention Y?'");
    console.log("  - 'What happens at 1:30?'");
  }
  console.log("");

  // Démarrer le chat interactif
  startInteractiveChat();
}

// Fonction de chat interactif
function startInteractiveChat() {
  const askInput = () => {
    rl.question("❓ Your question (or 'quit' to exit): ", async (input) => {
      const trimmedInput = input.trim();

      if (trimmedInput === "quit" || trimmedInput === "exit") {
        console.log("👋 Goodbye!");
        rl.close();
        return;
      }

      if (trimmedInput === "") {
        askInput();
        return;
      }

      // Traiter la question
      await askQuestion(trimmedInput);
      askInput();
    });
  };

  askInput();
}

// Fonction principale
async function startApp() {
  console.log("🎬 RecapGPT - Video Q&A with Timestamps");
  console.log("📝 Paste a video URL to get started!\n");

  rl.question("🔗 Enter video URL: ", async (url) => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      console.log("❌ No URL provided. Goodbye!");
      rl.close();
      return;
    }

    await loadRecapAndChat(trimmedUrl);
  });
}

// Démarrage de l'application
startApp();
