import fs from "fs";
import path from "path";

const rootDir = path.resolve();
const folders = {
  front: {
    files: ["index.html", "main.js", "App.js"],
    subfolders: ["src"]
  },
  back: {
    files: ["index.js", "auth.js", "authController.js"],
    subfolders: ["routes", "controllers"]
  }
};

// Create folder structure
const createFolderStructure = () => {
  console.log("Creating folder structure...");
  Object.keys(folders).forEach((folder) => {
    const folderPath = path.join(rootDir, folder);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
      console.log(`Created folder: ${folderPath}`);
    }

    // Create subfolders
    folders[folder].subfolders.forEach((subfolder) => {
      const subfolderPath = path.join(folderPath, subfolder);
      if (!fs.existsSync(subfolderPath)) {
        fs.mkdirSync(subfolderPath);
        console.log(`Created subfolder: ${subfolderPath}`);
      }
    });
  });
};

// Move files to their respective folders
const moveFiles = () => {
  console.log("Moving files...");
  Object.keys(folders).forEach((folder) => {
    folders[folder].files.forEach((file) => {
      const srcPath = path.join(rootDir, file);
      let destPath;

      if (folder === "front" && file !== "index.html") {
        destPath = path.join(rootDir, folder, "src", file);
      } else if (folder === "back" && file === "auth.js") {
        destPath = path.join(rootDir, folder, "routes", file);
      } else if (folder === "back" && file === "authController.js") {
        destPath = path.join(rootDir, folder, "controllers", file);
      } else {
        destPath = path.join(rootDir, folder, file);
      }

      if (fs.existsSync(srcPath)) {
        fs.renameSync(srcPath, destPath);
        console.log(`Moved: ${srcPath} -> ${destPath}`);
      }
    });
  });
};

// Create package.json files
const createPackageJson = () => {
  console.log("Creating package.json files...");

  // Root package.json
  const rootPackageJson = {
    name: "sellsathi",
    version: "1.0.0",
    description: "Root package for frontend and backend",
    scripts: {
      dev: "concurrently \"npm run dev:front\" \"npm run dev:back\"",
      "dev:front": "npm --prefix front run dev",
      "dev:back": "npm --prefix back run dev",
      build: "npm --prefix front run build",
      start: "npm --prefix back run start"
    },
    devDependencies: {
      concurrently: "^8.0.1"
    }
  };
  fs.writeFileSync(path.join(rootDir, "package.json"), JSON.stringify(rootPackageJson, null, 2));
  console.log("Created root package.json");

  // Frontend package.json
  const frontPackageJson = {
    name: "frontend",
    version: "1.0.0",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview"
    },
    dependencies: {
      react: "^18.2.0",
      "react-dom": "^18.2.0"
    },
    devDependencies: {
      vite: "^4.0.0"
    }
  };
  fs.writeFileSync(path.join(rootDir, "front", "package.json"), JSON.stringify(frontPackageJson, null, 2));
  console.log("Created frontend package.json");

  // Backend package.json
  const backPackageJson = {
    name: "backend",
    version: "1.0.0",
    scripts: {
      dev: "nodemon index.js",
      start: "node index.js"
    },
    dependencies: {
      express: "^4.18.2",
      cors: "^2.8.5",
      "body-parser": "^1.20.2",
      "firebase-admin": "^12.0.0"
    },
    devDependencies: {
      nodemon: "^3.0.1"
    }
  };
  fs.writeFileSync(path.join(rootDir, "back", "package.json"), JSON.stringify(backPackageJson, null, 2));
  console.log("Created backend package.json");
};

// Run the setup
const setupProject = () => {
  createFolderStructure();
  moveFiles();
  createPackageJson();
  console.log("Project setup complete!");
};

setupProject();