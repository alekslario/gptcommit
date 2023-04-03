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
const commands = process.argv.reduce((acc, x) => {
  if (/=/.test(x)) {
    const [key, value] = x.split("=");
    return { ...acc, [key]: value };
  }
  return { ...acc, [x]: true };
}, {});
const randomPick = commands["random"];
const path = commands["path"];
//check if git is installed
let status = "";

try {
  status = execSync(
    `git --git-dir=${
      path || process.cwd()
    }/.git rev-parse --is-inside-work-tree`
  );
} catch (error) {}
if (status.toString().trim() !== "true") {
  console.log("No git in the directory.");
  process.exit();
}

//check if there any large files already added to git, generally not gonna happen ever
//general directory size check run before this script and hence this is not needed, probably
if (path) {
  let largeFiles = "";
  try {
    largeFiles = execSync(
      `cd ${path || process.cwd()} && bash /home/alex/check.size.sh`
    );
  } catch (error) {
    largeFiles = "stub";
  }
  if (largeFiles.toString().trim().length !== 0) {
    console.log(
      chalk.yellow(
        `Found a large file over 30mb in ${path || process.cwd()}...Aborting`
      )
    );
    process.exit();
  }
}
//
let diff = "";
try {
  diff = execSync(
    `git --git-dir=${
      path || process.cwd()
    }/.git diff --cached -- ':!package-lock.json'`
  ).toString();
} catch (error) {}
if (!diff.trim()) {
  console.log(
    chalk.yellow(
      "No diff found (package-lock.json was excluded from diff). Or something else..."
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

answer = answer.replace(/"/g, '\\"');

try {
  execSync(
    `cd ${path || process.cwd()} && git commit -m "${answer}" && git push`
  );
} catch (error) {
  console.log(error);
}
