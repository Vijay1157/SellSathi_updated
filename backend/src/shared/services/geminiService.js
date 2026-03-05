'use strict';
const { GoogleGenerativeAI, SchemaType, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');

/**
 * GEMINI SERVICE (DIAGNOSTIC VERSION V3)
 * 
 * Optimized for high-precision Identity Document OCR.
 * Added local file logging to debug-gemini.log for audit.
 */

const logFile = path.join(__dirname, '../../../../debug-gemini.log');

function logDebug(msg) {
    const timestamp = new Date().toISOString();
    const formattedMsg = `[${timestamp}] ${msg}\n`;
    fs.appendFileSync(logFile, formattedMsg);
    console.log(`[GEMINI_DEBUG] ${msg}`);
}

if (!process.env.GEMINI_API_KEY) {
    logDebug('CRITICAL: GEMINI_API_KEY is not defined in environment variables.');
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Models prioritized by verified stability for this specific API key
const GEMINI_MODELS = [
    'gemini-flash-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-2.5-flash',
];

// Safety settings - Crucial for ID docs which contain sensitive strings that trigger filters
const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE }
];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function extractAadhaarData(imageBuffer, mimeType, retries = 2) {
    logDebug(`--- START NEW EXTRACTION (MIME: ${mimeType}) ---`);

    const prompt = `You are a high-precision OCR engine for Indian Identity Cards. 
    Analyze the image and find:
    - name: Full Legal Name
    - aadhaar_no: 12-digit Aadhaar number (Find the FULL number. If masked with X, find the unmasked number elsewhere on the card).
    - dob: Date of birth (DD/MM/YYYY)
    - gender: MALE or FEMALE
    - address: Full postal address
    - pincode: 6-digit PIN code
    - phone: 10-digit mobile number found anywhere (usually at back or near address).

    Return ONLY a JSON object. No Markdown. No code blocks.`;

    const ocrSchema = {
        type: SchemaType.OBJECT,
        properties: {
            name: { type: SchemaType.STRING },
            aadhaar_no: { type: SchemaType.STRING },
            dob: { type: SchemaType.STRING },
            gender: { type: SchemaType.STRING },
            address: { type: SchemaType.STRING },
            pincode: { type: SchemaType.STRING },
            phone: { type: SchemaType.STRING }
        },
        required: ["name"]
    };

    let lastError = null;

    for (const modelName of GEMINI_MODELS) {
        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                logDebug(`Attempt with: ${modelName} | Attempt: ${attempt}`);

                const model = genAI.getGenerativeModel({ model: modelName.trim(), safetySettings });
                const generationConfig = {
                    temperature: 0,
                    responseMimeType: "application/json",
                    responseSchema: ocrSchema
                };

                const imgPart = { inlineData: { data: imageBuffer.toString("base64"), mimeType } };

                const result = await model.generateContent({
                    contents: [{ role: 'user', parts: [imgPart, { text: prompt }] }],
                    generationConfig
                });

                const rawText = result.response.text();
                logDebug(`RAW AI RESPONSE (TRUNCATED): ${rawText.substring(0, 300)}`);

                const cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
                const data = JSON.parse(cleanJson);

                // --- ADVANCED PATTERN SEARCH ---
                // If AI missed standard IDs, pull them manually from the raw text
                if (!data.aadhaar_no || data.aadhaar_no.replace(/\D/g, '').length < 12) {
                    const match = rawText.match(/\d{4}[\s-]?\d{4}[\s-]?\d{4}/);
                    if (match) data.aadhaar_no = match[0].replace(/\D/g, '');
                }
                if (!data.phone || data.phone.replace(/\D/g, '').length < 10) {
                    const match = rawText.match(/[6-9]\d{9}/) || rawText.match(/[6-9]\d{4}\s?\d{5}/);
                    if (match) data.phone = match[0].replace(/\D/g, '');
                }

                logDebug(`FINAL PARSED: ${JSON.stringify(data)}`);
                return data;

            } catch (err) {
                lastError = err;
                logDebug(`ERROR with ${modelName}: ${err.message}`);

                if (err.status === 404) break;
                if (err.status === 429) { await delay(2000); continue; }
                await delay(1000);
            }
        }
    }
    throw lastError || new Error("ID extraction failed completely.");
}

module.exports = { extractAadhaarData };
