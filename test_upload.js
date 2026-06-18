const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');

async function upload() {
  const form = new FormData();
  form.append('file', fs.createReadStream('sample_data/ACME_10K_2023.pdf'));
  form.append('companyName', 'Acme Corp');
  form.append('ticker', 'ACME');
  form.append('filingType', '10-K');
  form.append('fiscalYear', '2023');

  console.log('Uploading document to /api/parse...');
  
  try {
    const res = await fetch('http://localhost:3000/api/parse', {
      method: 'POST',
      body: form,
      headers: form.getHeaders(),
    });
    
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Upload failed: ${res.status} ${text}`);
    }
    
    const data = await res.json();
    console.log('Success!', data);
  } catch (e) {
    console.error(e);
  }
}

upload();
