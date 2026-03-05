const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
require('dotenv').config({ path: 'c:/Users/RAHUL/Desktop/abc/SellSathi_updated/backend/.env' });

async function test() {
    let log = '';
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];

    for (const m of models) {
        try {
            log += `Checking model: ${m} ... `;
            const model = genAI.getGenerativeModel({ model: m });
            const res = await model.generateContent("Just say YES.");
            log += `SUCCESS: ${res.response.text()}\n`;
        } catch (e) {
            log += `FAILED: ${e.message}\n`;
        }
    }
    fs.writeFileSync('c:/Users/RAHUL/Desktop/abc/SellSathi_updated/backend/gemini-test-results.txt', log);
    console.log('Results written to gemini-test-results.txt');
}

test();
