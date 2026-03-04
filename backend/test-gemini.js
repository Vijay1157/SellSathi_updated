require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function test() {
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const result = await model.generateContent("hello");
        console.log("Success gemini-2.0-flash:", result.response.text());
    } catch (e) {
        console.error("Error gemini-2.0-flash:", e);
    }
}

test();
