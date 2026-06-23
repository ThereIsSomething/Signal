const fs = require('fs');
const file = 'src/lib/pipeline/orchestrator.ts';
let content = fs.readFileSync(file, 'utf8');

const helper = `
/**
 * Check if the pipeline was cancelled by the user.
 */
async function checkNotCancelled(documentId: string) {
  const { data } = await supabase.from('documents').select('status').eq('id', documentId).single();
  if (data?.status === 'failed') {
    throw new Error('Pipeline stopped by user');
  }
}

/**
 * Update document status.
`;

content = content.replace('/**\n * Update document status.', helper.trim());

for (let i = 1; i <= 8; i++) {
  const stepRegex = new RegExp(`(// ─── Step ${i}: .*)\\n`);
  content = content.replace(stepRegex, `$1\n    await checkNotCancelled(documentId);\n`);
}

fs.writeFileSync(file, content);
console.log('Done');
