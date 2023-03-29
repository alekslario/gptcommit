import fs from "fs";

export const mlog = (input) => {
  const filePath = "/home/alex/log-commit.txt";
  const fileOptions = { flag: "a" }; // "a" flag for append mode

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "");
  }

  fs.writeFileSync(filePath, input + "\n", fileOptions);
};
