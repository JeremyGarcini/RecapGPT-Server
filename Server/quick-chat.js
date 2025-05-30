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

// Recap pré-chargée de votre exemple TikTok
const recapContext = {
  transcript:
    "MrBeast il est pas débile, il savait très bien qu'il y avait des gens qui allaient essayer de tricher en remplaçant par exemple un stylo pour tablette à la place d'un doigt qui pourrait rester sur l'écran toute la journée. Alors pour éviter ça, dans le concept du jeu, vous deviez très souvent bouger votre doigt. Sauf que ça n'a pas suffi. Des petits génies ont programmé des machines, des fois énormes, qui bougent des petits stylos tactiles. Vraiment, c'est une dinguerie ce qu'ils ont réussi à faire. Alors on sait pas pour autant si dans tous les gagnants, il y avait des tricheurs, mais on a quand même des doutes. D'ailleurs il y a un autre souci qui a tellement énervé les gens qu'en fait ils en avaient plus rien à foutre qu'il y ait des tricheurs sur l'application. En fait le vrai problème, c'est que l'appli il y avait tellement d'utilisateurs qu'elle était buggée. Et ça, ça a fait perdre beaucoup de gens. Si vous scrollez sur TikTok, vous pouvez peut-être voir passer des gens qui ont passé 32 heures sur l'application avec leur doigt collé, sans dormir, pour qu'il soit déconnecté par un bug. Toute la polémique que ça a créé, ça a amené une grosse remise en question dans la tête de MrBeast, qui a décidé de faire des changements. Mais ça, on va en reparler très vite. En parlant de glitch, on est clairement dans le thème d'un autre concours qu'a organisé MrBeast, cette fois-ci pour gagner 100 000 dollars sur le jeu le plus populaire du monde.",
  summary:
    "1. MrBeast anticipated cheating in his challenge by requiring constant finger movement, but people still bypassed it with programmed machines.\n2. The app's major issue was server overload from too many users, causing glitches that unfairly eliminated participants.\n3. The backlash led MrBeast to rethink his approach, similar to issues in another high-stakes contest he hosted.",
};

// Fonction pour poser une question sur la recap
async function askQuestion(question) {
  try {
    console.log("🤔 Thinking...");

    const response = await deepseek.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content: `You are an assistant that answers questions based on a TikTok video about MrBeast. Here's the context:

FULL TRANSCRIPT:
${recapContext.transcript}

SUMMARY:
${recapContext.summary}

Answer user questions based ONLY on this content. If the answer is not in the provided content, say so clearly. Keep responses concise and direct (2-3 sentences max). You can respond in any language that best matches the user's question or the content language.`,
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

// Fonction principale interactive
async function startQuickChat() {
  console.log("🎬 RecapGPT - Quick Chat on MrBeast video");
  console.log("📋 Recap loaded: TikTok video about MrBeast challenge problems");
  console.log("💡 Ask your questions! (type 'quit' to exit)\n");

  const askInput = () => {
    rl.question("❓ Your question: ", async (input) => {
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

// Démarrage du chat
startQuickChat();
