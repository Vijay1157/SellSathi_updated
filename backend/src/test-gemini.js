const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config({ path: 'c:/Users/RAHUL/Desktop/abc/SellSathi_updated/backend/.env' });

async function test() {
    console.log('API KEY:', process.env.GEMINI_API_KEY ? 'Present' : 'Missing');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];

    for (const m of models) {
        try {
            process.stdout.write(`Checking model: ${m} ... `);
            const model = genAI.getGenerativeModel({ model: m });
            const res = await model.generateContent("Just say YES.");
            console.log(`SUCCESS: ${res.response.text()}`);
        } catch (e) {
            console.log(`FAILED: ${e.message}`);
        }
    }
}

test();
