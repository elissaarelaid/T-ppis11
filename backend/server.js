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

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY ?? "" });
const agentConfigPath = path.join(__dirname, "agent-config.json");
const kbPath = path.join(__dirname, "knowledge-base.json");

const agentConfig = JSON.parse(fs.readFileSync(agentConfigPath, "utf8"));
const kb = JSON.parse(fs.readFileSync(kbPath, "utf8"));

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

let agentId = null;

async function createAgent() {
  const instructions =
    `${agentConfig.system_prompt}\n\n` +
    `Allpool on sinu üldine IKT ekspordi ja regulatsioonide teadmistebaas. Kasuta seda taustateadmisena, kuid riigipõhise info leidmiseks kasuta vajadusel veebipõhist otsingut.\n\n` +
    knowledgeText;

  const tools = agentConfig.tools || [];
  const completionArgs = agentConfig.completion_args || {};

  const agent = await client.beta.agents.create({
    model: agentConfig.model || "mistral-medium-latest",
    name: agentConfig.name,
    description: agentConfig.description,
    instructions,
    tools,
    completionArgs
  });

  console.log("Loodud agent ID:", agent.id);
  agentId = agent.id;
}

app.post("/ask", async (req, res) => {
  const { prompt } = req.body;
  const userPrompt = prompt || "";

  if (!userPrompt) {
    return res.status(400).json({ error: "Tühi küsimus" });
  }

  if (!agentId) {
    return res
      .status(503)
      .json({ error: "Agent ei ole veel valmis. Proovi mõne hetke pärast uuesti." });
  }

  try {
    const response = await client.agents.complete({
      agentId,
      messages: [
        {
          role: "user",
          content: userPrompt
        }
      ]
    });

    const reply = response.choices?.[0]?.message?.content || "";
    res.json({ reply });
  } catch (err) {
    console.error("Mistral Agents API error:", err.statusCode, err.body || err.message);
    res.status(500).json({ error: "Mistral API error" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

(async () => {
  try {
    await createAgent();
    app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
    });
  } catch (err) {
    console.error("Agendi loomine ebaõnnestus:", err.statusCode, err.body || err.message);
    process.exit(1);
  }
})();
