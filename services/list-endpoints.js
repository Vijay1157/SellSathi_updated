const fs = require('fs');
const content = fs.readFileSync('auth.cjs', 'utf-8');
const lines = content.split('\n');
lines.forEach((line, i) => {
    if (line.includes('app.post(') || line.includes('app.get(')) {
        console.log(`Line ${i + 1}: ${line.trim()}`);
    }
});
