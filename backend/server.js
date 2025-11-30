import express from "express";
import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "../frontend")));

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// --- Lae agent-config ja knowledge-base ---
const agentConfigPath = path.join(__dirname, "agent-config.json");
const kbPath = path.join(__dirname, "knowledge-base.json");

const agentConfig = JSON.parse(fs.readFileSync(agentConfigPath, "utf8"));
const kb = JSON.parse(fs.readFileSync(kbPath, "utf8"));

// Ehita teadmistebaasi tekst system-sõnumisse
function buildKnowledgeText() {
  let text = "";
  text += (kb.intro || "") + "\n\n";

  if (Array.isArray(kb.topics)) {
    kb.topics.forEach((topic) => {
      text += `# ${topic.title}\n`;
      if (Array.isArray(topic.content)) {
        topic.content.forEach((line) => {
          text += `- ${line}\n`;
        });
      }
      text += "\n";
    });
  }

  return text.trim();
}

const knowledgeText = buildKnowledgeText();

// API endpoint
app.post("/ask", async (req, res) => {
  const { prompt } = req.body;
  const userPrompt = prompt || "";
  try {
    const systemMessage = `
  ${agentConfig.system_prompt}

  Allpool on sinu teadmistebaas. Kasuta ainult seda infot vastamiseks.
  Kui teadmistest ei piisa, vasta: "Seda infot ei ole praeguses teadmistebaasis".

  ${knowledgeText}
      `.trim();
      const response = await client.chat.complete({
        model: agentConfig.model || "mistral-small-latest",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userPrompt },
        ],
      });

      res.json({ reply: response.choices[0].message.content });
    } catch (err) {
      console.error("Mistral API error:", err.statusCode, err.body || err.message);
      res.status(500).json({ error: "Mistral API error" });
    }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
