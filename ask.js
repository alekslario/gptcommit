import inquirer from "inquirer";

export default async (prompt) => {
  //pick model
  return await new Promise((resolve) => {
    inquirer.prompt(prompt).then((answers) => {
      resolve(answers.something);
    });
  });
  //
};
