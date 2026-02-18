# My Project

This project is organized into two main parts: the frontend and the backend.

## Frontend

The frontend is located in the `front` folder and is built using React and TypeScript. It includes the following key files:

- **package.json**: Contains the configuration for the frontend project, including dependencies and scripts.
- **tsconfig.json**: TypeScript configuration specifying compiler options and files to include.
- **public/index.html**: The main HTML file that serves as the entry point for the frontend application.
- **src/main.tsx**: The entry point for the React application, rendering the main component into the DOM.
- **src/App.tsx**: Defines the main application component, including routing and layout.
- **src/components/Header.tsx**: Exports a `Header` component used for navigation or branding.
- **src/pages/Home.tsx**: Exports a `Home` component representing the homepage.
- **src/styles/global.css**: Contains global CSS styles applied throughout the application.

## Backend

The backend is located in the `back` folder and is built using Node.js and TypeScript. It includes the following key files:

- **package.json**: Contains the configuration for the backend project, including dependencies and scripts.
- **tsconfig.json**: TypeScript configuration specifying compiler options and files to include.
- **src/index.ts**: The entry point for the backend application, setting up the server and middleware.
- **src/controllers/userController.ts**: Exports a `UserController` class that handles user-related requests and responses.
- **src/routes/index.ts**: Exports a function that sets up the routes for the backend application.
- **src/models/user.ts**: Defines the `User` model, representing the user data structure.
- **src/services/userService.ts**: Exports a `UserService` class containing business logic related to user operations.

## Setup Instructions

1. Clone the repository.
2. Navigate to the `front` folder and run `npm install` to install frontend dependencies.
3. Navigate to the `back` folder and run `npm install` to install backend dependencies.
4. Start the frontend and backend servers as per the instructions in their respective `package.json` files.

## Usage Guidelines

- Ensure that both the frontend and backend servers are running to interact with the application.
- Refer to the documentation in each folder for specific usage instructions related to the frontend and backend components.