#!/usr/bin/env node
import { execSync } from "child_process";
import { Configuration, OpenAIApi } from "openai";
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const ai = new OpenAIApi(configuration);

const normalize = (str) => {
  return str.replace(/feat: /g, "").trim();
};

let diff = execSync("git diff --cached").toString();
if (!diff.trim()) {
  throw new Error("No diff found");
}
diff = diff
  .split("\n")
  .map((x) => x.trim())
  .filter((x) => x)
  .filter((x) => !/diff|index|---|@@|\+\+\+/.test(x))
  .join("");

const getChatCompletion = async (messages = []) => {
  const completion = await ai.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "user",
        content: `give me a commit message for this, using only a-z ${diff}`,
      },
    ],
    max_tokens: 1007,
    temperature: 0.8,
  });
  return completion.data.choices[0].message.content;
};
let res = await getChatCompletion();
res = normalize(res);
console.log(res);
