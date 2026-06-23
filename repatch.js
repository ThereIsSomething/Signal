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
    const error = new Error('Pipeline stopped by user');
    error.name = 'PipelineStoppedError';
    throw error;
  }
}

/**
 * Update document status.`;

if (!content.includes('checkNotCancelled')) {
  // Try matching \r\n and \n
  content = content.replace('/**\r\n * Update document status.', helper);
  content = content.replace('/**\n * Update document status.', helper);

  for (let i = 1; i <= 8; i++) {
    const stepRegex = new RegExp(`(// ─── Step ${i}: .*)\\r?\\n`);
    content = content.replace(stepRegex, `$1\n    await checkNotCancelled(documentId);\n`);
  }
  
  // also handle the catch block to not overwrite error_message if it's already "Pipeline stopped by user"
  // Actually we just throw it and let it get caught. We can change the errorMessage extraction
  content = content.replace(
    'const errorMessage =\n      error instanceof Error ? error.message : "Unknown pipeline error";',
    'const errorMessage =\n      error instanceof Error ? error.message : "Unknown pipeline error";\n    if (errorMessage === "Pipeline stopped by user") {\n      console.log(`[Pipeline] Stopped for document ${documentId}`);\n      return;\n    }'
  );

  fs.writeFileSync(file, content);
  console.log('Patched');
} else {
  console.log('Already patched');
}
