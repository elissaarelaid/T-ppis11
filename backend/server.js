import express from "express";
import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(express.json());

// serveeri frontend kausta õigesti
app.use(express.static(path.join(__dirname, "../frontend")));

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

// API endpoint
app.post("/ask", async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
    });
    res.json({ reply: response.choices[0].message.content });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// kõigi mittespetsiifiliste GET päringute korral serveerime index.html
app.use(express.static(path.join(__dirname, "../frontend")));

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
