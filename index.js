#!/usr/bin/env node
import { execSync } from "child_process";
import ask from "./ask.js";
import { Configuration, OpenAIApi } from "openai";
import ora from "ora";
import chalk from "chalk";
import stripAnsi from "strip-ansi";
const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const ai = new OpenAIApi(configuration);
const spinner = ora("Loading commits...🦄");
const [_, __, arg1] = process.argv;
const commands = process.argv.reduce((acc, x) => ({ ...acc, [x]: true }), {});
const randomPick = commands["random"];

//check if git is installed
let status = "";
try {
  status = execSync("git rev-parse --is-inside-work-tree");
} catch (error) {}
if (status.toString().trim() !== "true") {
  console.log("No git in the directory.");
  process.exit();
}

let diff = execSync("git diff --cached -- ':!package-lock.json'").toString();
if (!diff.trim()) {
  console.log(
    chalk.yellow(
      "No diff found (package-lock.json was excluded from diff) or there is no git in the directory. Or something else..."
    )
  );
  process.exit();
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
        content: `give me a commit message for this (max 30 words) ${diff}`,
      },
    ],
    max_tokens: 1007,
    temperature: 0.5,
    n: 6,
  });

  return completion.data.choices.map((choice, index) => choice.message.content);
};
spinner.start();
console.log("\n");
let res = await getChatCompletion();
spinner.stop();
let answer = "";
if (!randomPick) {
  const makeYourOwn = chalk.yellow("Make you own commit message");
  answer = await ask([
    {
      type: "list",
      name: "something",
      message: chalk.red("Pick a commit message for this diff:"),
      choices: [makeYourOwn, ...res.map((x) => chalk.green(x))],
    },
  ]);

  if (answer === makeYourOwn) {
    answer = await ask([
      {
        type: "input",
        name: "something",
        message: chalk.red("Enter your commit message:"),
      },
    ]);
  }
  answer = stripAnsi(answer);
} else {
  answer = res[Math.floor(Math.random() * res.length)];
}
console.log(chalk.green(`Commit message: ${answer}`));
execSync(`git commit -m "${answer.replace(/"/g, '\\"')}"`);
