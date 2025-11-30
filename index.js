import "dotenv/config";
import { Mistral } from "@mistralai/mistralai";
const key = process.env.MISTRAL_API_KEY

console.log("API KEY:", key);

const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

async function run() {
const response = await client.chat.complete({
    model: "mistral-large-latest",
    messages: [
    { role: "user", content: "Tere! Mis on Mistral AI?" }
    ]
});

console.log("AI vastus:", response.choices[0].message.content);
}

run();