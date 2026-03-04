import fs from "fs";
import path from "path";

const rootDir = path.resolve();
const frontDir = path.join(rootDir, "front");
const backDir = path.join(rootDir, "back");

// File extensions and patterns for classification
const frontExtensions = [".jsx", ".tsx", ".js", ".ts", ".html", ".css", ".scss", ".png", ".jpg", ".svg"];
const backExtensions = [".cjs", ".mjs", ".json"];
const backKeywords = ["server", "auth", "controller", "model", "route", "service"];

// Create front and back directories if they don't exist
if (!fs.existsSync(frontDir)) fs.mkdirSync(frontDir);
if (!fs.existsSync(backDir)) fs.mkdirSync(backDir);

// Function to classify files
const classifyFile = (fileName) => {
    const ext = path.extname(fileName).toLowerCase();
    if (frontExtensions.includes(ext)) return "front";
    if (backExtensions.includes(ext)) return "back";

    // Check for backend-related keywords in filenames
    for (const keyword of backKeywords) {
        if (fileName.toLowerCase().includes(keyword)) return "back";
    }

    // Default to front if no match
    return "front";
};

// Function to move files
const moveFile = (filePath, destination) => {
    const relativePath = path.relative(rootDir, filePath);
    const destPath = path.join(destination, relativePath);

    // Ensure destination directory exists
    const destDir = path.dirname(destPath);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });

    // Move the file
    fs.renameSync(filePath, destPath);
    console.log(`Moved: ${relativePath} -> ${path.relative(rootDir, destPath)}`);
};

// Traverse the directory and move files
const organizeFiles = (dir) => {
    const items = fs.readdirSync(dir, { withFileTypes: true });

    for (const item of items) {
        const itemPath = path.join(dir, item.name);

        if (item.isDirectory()) {
            // Skip node_modules, .git, front, and back directories
            if (["node_modules", ".git", "front", "back"].includes(item.name)) continue;
            organizeFiles(itemPath); // Recurse into subdirectories
        } else {
            const category = classifyFile(item.name);
            const destination = category === "front" ? frontDir : backDir;
            moveFile(itemPath, destination);
        }
    }
};

// Start organizing files
console.log("Organizing files...");
organizeFiles(rootDir);
console.log("Done!");