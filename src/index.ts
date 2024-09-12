import { Command } from "commander";
import csv from "csv-parser";
import * as dotenv from "dotenv";
import fs from "fs-extra";
import OpenAI from "openai";
import path from "path";
import xlsx from "xlsx";
import { Worker, isMainThread, parentPort, workerData } from "worker_threads";
import os from "os";

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const IMAGE_FOLDER = "images";
const OUTPUT_FOLDER = "dist";
const DATA_FILE = "data/datasource.csv";

const program = new Command();
program
  .option("-c, --column <COLUMN>", "Column name in the data source")
  .parse(process.argv);

const options = program.opts();

async function loadCSV(filePath: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", () => resolve(results))
      .on("error", (error) => reject(error));
  });
}

async function loadXLSX(filePath: string): Promise<any[]> {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  return xlsx.utils.sheet_to_json(sheet);
}

async function suggestNameForImage(
  imagePath: string,
  csvData: any[],
  column: string
): Promise<string> {
  const csvNames = csvData.map((row) => row[column]).join(", ");

  try {
    const imageBuffer = await fs.readFile(imagePath);
    const encoded = Buffer.from(imageBuffer).toString("base64");

    const chatCompletion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `I run a business that connects farmers with buyers through direct sales. I've uploaded an image of a farm produce item and provided a list of possible names from my CSV: ${csvNames}. Please compare the uploaded image with the names in the list and always return a plain text JSON object with this structure: [<boolean>, "<name from list or blank if no match>"]. If no match is found, return [false, "<>"]. Do not format the response as code, markdown, or include backticks, only provide the JSON in plain text.`,
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${encoded}`,
              },
            },
          ],
        },
      ],
    });

    const suggestedName =
      chatCompletion.choices[0].message?.content || `[false, ""]`;

    let jsonResponse;
    try {
      jsonResponse = JSON.parse(suggestedName.toString());
      const [matchFound, newFileName] = jsonResponse;

      if (matchFound) {
        return newFileName;
      }

      throw new Error("No match found");
    } catch (error) {
      console.error("Error parsing the OpenAI response as JSON:", error);
      console.error(`\n${suggestedName} was considered not valid`);
      return "No match found";
    }
  } catch (error) {
    console.error("Error during image upload or processing:", error);
    return "No match found";
  }
}

async function processImageInWorker(
  filePath: string,
  data: any[],
  column: string
): Promise<void> {
  const finalName = await suggestNameForImage(filePath, data, column);

  if (finalName !== "No match found") {
    const newName = `${finalName}${path.extname(path.basename(filePath))}`;
    const outputFilePath = path.join(OUTPUT_FOLDER, newName);
    await fs.copy(filePath, outputFilePath);
    parentPort?.postMessage(`Renamed ${path.basename(filePath)} to ${newName}`);
  } else {
    parentPort?.postMessage(`No match found for ${path.basename(filePath)}`);
  }
}

if (isMainThread) {
  async function main() {
    await fs.ensureDir(OUTPUT_FOLDER);

    let data: any[] = [];
    if (DATA_FILE.endsWith(".csv")) {
      data = await loadCSV(DATA_FILE);
    } else if (DATA_FILE.endsWith(".xlsx")) {
      data = await loadXLSX(DATA_FILE);
    } else {
      console.error("Unsupported file format.");
      return;
    }

    const columns = Object.keys(data[0]);

    if (!options.column || !columns.includes(options.column)) {
      console.error(
        `Please provide a valid column name from the data source. Available columns: ${columns.join(
          ", "
        )}`
      );
      return;
    }

    const imageFiles = await fs.readdir(IMAGE_FOLDER);
    const cpuCount = Math.floor(os.cpus().length * 0.8); // Use 80% of available CPU cores
    const workerPool = new Set();

    async function runWorker(filePath: string) {
      return new Promise((resolve, reject) => {
        const worker = new Worker(__filename, {
          workerData: { filePath, data, column: options.column },
        });

        worker.on("message", (message) => {
          console.log(message);
          workerPool.delete(worker);
          resolve(null);
        });

        worker.on("error", (error) => {
          workerPool.delete(worker);
          reject(error);
        });

        worker.on("exit", (code) => {
          if (code !== 0) {
            reject(new Error(`Worker stopped with exit code ${code}`));
          }
        });

        workerPool.add(worker);
      });
    }

    for (const file of imageFiles) {
      const filePath = path.join(IMAGE_FOLDER, file);
      if (fs.statSync(filePath).isFile()) {
        while (workerPool.size >= cpuCount) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        runWorker(filePath).catch(console.error);
      }
    }

    // Wait for all workers to finish
    while (workerPool.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  main().catch((error) => console.error(error));
} else {
  // Worker thread
  processImageInWorker(
    workerData.filePath,
    workerData.data,
    workerData.column
  ).catch((error) => {
    parentPort?.postMessage(`Error processing image: ${error.message}`);
  });
}
