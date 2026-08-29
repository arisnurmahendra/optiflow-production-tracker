import { readFile } from 'node:fs/promises';

const source = await readFile('Code.js', 'utf8');
const functionPattern = /^function\s+([A-Za-z0-9_]+)\s*\([^)]*\)\s*\{/gm;
const failures = [];
let match;

while ((match = functionPattern.exec(source)) !== null) {
  const functionName = match[1];
  const bodyStart = functionPattern.lastIndex;
  const body = source.slice(bodyStart, findMatchingBrace(source, bodyStart - 1));
  const firstStatement = body
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*'))[0];
  const hasValidationBlock = body.split(/\r?\n/).slice(0, 4).some((line) =>
    line.includes('Input Validation & Sanitization'),
  );

  if (!hasValidationBlock || !firstStatement?.includes('OptiflowValidation.')) {
    failures.push({
      functionName,
      hasValidationBlock,
      firstStatement: firstStatement || '',
    });
  }
}

if (failures.length > 0) {
  console.error(JSON.stringify(failures, null, 2));
  throw new Error('GAS validation audit failed.');
}

console.log('gas validation audit ok');

function findMatchingBrace(text, openBraceIndex) {
  let depth = 0;

  for (let index = openBraceIndex; index < text.length; index += 1) {
    if (text[index] === '{') {
      depth += 1;
    }

    if (text[index] === '}') {
      depth -= 1;
    }

    if (depth === 0) {
      return index;
    }
  }

  throw new Error('Unable to parse function body.');
}
