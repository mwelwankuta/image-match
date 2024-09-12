
# Image Match

This project, **Image Match**, is a bulk image renaming tool that uses the OpenAI API to rename images based on a list of possible names provided in a CSV or Excel file. The tool distributes the renaming task across multiple threads, utilizing 80% of the CPU cores available on the user's machine to process images in parallel for faster performance.

## Features

- Rename images in bulk based on names in a CSV or Excel file.
- Uses OpenAI's API to match images with names.
- Automatically distributes workload across multiple threads for efficiency.
- Supports both CSV and Excel files as data sources.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (Download from [here](https://nodejs.org/))
- **OpenAI API Key** (Get it from [OpenAI](https://openai.com/api/))

## Installation

1. **Clone the repository:**

   ```bash
   git clone https://github.com/mwelwankuta/image-match.git
   ```

2. **Navigate to the project directory:**

   ```bash
   cd image-match
   ```

3. **Install dependencies:**

   ```bash
   npm install
   ```

4. **Set up your OpenAI API key:**

   Create a `.env` file in the root directory of the project and add your OpenAI API key:

   ```bash
   touch .env
   ```

   Inside `.env`, add:

   ```
   OPENAI_API_KEY=your-openai-api-key
   ```

   Replace `your-openai-api-key` with your actual API key from OpenAI.

## Project Setup

1. **Organize your files:**

   - **Images**: Place all the images you want to rename inside the `images/` folder.
   - **Data Source**: Place your CSV or Excel file inside the `data/` folder and rename it to `datasource.csv`. This file should contain the list of possible names that can be matched with your images.

2. **Data File Format:**

   - The data file should be either a `.csv` or `.xlsx` file.
   - One of the columns in this file should contain the names you want to use for renaming the images.

## Running the Tool

Once everything is set up, you can run the tool with the following command:

```bash
node -r ts-node/register ./src/index.ts -c "<YourColumnName>"
```

Replace `<YourColumnName>` with the name of the column from your CSV or Excel file that contains the names for renaming the images.

### Example

```bash
node -r ts-node/register ./src/index.ts -c "Product Name"
```

### Output

- The tool will process the images, and renamed images will be saved in the `dist` folder.
- The console will display the renaming progress, including whether each image found a match in the data source.

## Multithreading

This tool uses Node.js's `worker_threads` to process images in parallel. It automatically detects 80% of the CPU cores and assigns work accordingly to speed up the renaming process.

## Folder Structure

```bash
image-match/
│
├── images/             # Folder where you put your original images
│
├── dist/               # Folder where renamed images will be saved
│
├── data/
│   └── datasource.csv  # The CSV or Excel file with the list of names
│
├── src/
│   └── index.ts        # Main script
│
├── .env                # API Key configuration (not in the repo, you'll create this)
│
└── package.json        # Node.js dependencies and scripts
```

## Troubleshooting

- **Missing OpenAI API Key**: Ensure your `.env` file contains the correct OpenAI API key.
- **Invalid Column Name**: Double-check that the column name you provide matches the name exactly as it appears in your CSV or Excel file.
- **Unsupported File Format**: Ensure that your data file is either `.csv` or `.xlsx`.

## License

This project is licensed under the MIT License.

---

Feel free to raise an issue or contribute to the project if you encounter any problems or have suggestions for improvements. Happy coding!
