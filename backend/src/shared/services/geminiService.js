'use strict';
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_MODELS = ['gemini-2.0-flash', 'gemini-2.5-flash'];

/**
 * Extracts Aadhaar card data from an image buffer using Gemini AI.
 * @param {Buffer} imageBuffer
 * @param {string} mimeType
 * @returns {Promise<{name, aadhaar_no, dob, gender, address}>}
 */
async function extractAadhaarData(imageBuffer, mimeType) {
    const prompt = `Strict JSON extraction from Aadhaar card image. Extract these exact fields only:
{"name": "full name", "aadhaar_no": "12 digit number", "dob": "DD/MM/YYYY", "gender": "Male or Female", "address": "full address"}
Return ONLY the JSON object, no markdown, no explanation.`;

    let lastError = null;
    for (const modelName of GEMINI_MODELS) {
        try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await model.generateContent([
                { text: prompt },
                { inlineData: { data: imageBuffer.toString('base64'), mimeType } },
            ]);
            const text = result.response.text().trim();
            const match = text.match(/\{[\s\S]*\}/);
            if (!match) throw new Error('No JSON in AI response');
            const data = JSON.parse(match[0]);
            if (!data.name && !data.aadhaar_no) throw new Error('Key fields missing');
            return data;
        } catch (err) {
            console.warn(`[Gemini] ${modelName} failed: ${err.message}`);
            lastError = err;
        }
    }
    throw lastError || new Error('All Gemini models failed');
}

module.exports = { extractAadhaarData };
