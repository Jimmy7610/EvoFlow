
import fs from 'fs';

const content = fs.readFileSync('c:/EvoFlow/apps/web/app/chat/ChatClient.tsx', 'utf8');
let balance = 0;
const lines = content.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (let char of line) {
        if (char === '{') balance++;
        if (char === '}') balance--;
    }
    if (balance < 0) {
        console.log(`Brace error at line ${i + 1}: balance is ${balance}`);
        break;
    }
}
console.log(`Final balance: ${balance}`);
