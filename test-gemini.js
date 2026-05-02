const key = 'AIzaSyDLECwxfF8lTbIfRYytrjmkAMtbWGFx_zQ';
const model = 'gemini-3-pro-preview';

async function test() {
  console.log('Testing basic call...');
  const start = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents: [{ parts: [{ text: 'Say hello in one word' }] }] })
    });
    console.log(`Status: ${res.status} in ${Date.now() - start}ms`);
    if (!res.ok) {
      console.log('Error:', await res.text());
      return;
    }
    const data = await res.json();
    console.log('Response:', data?.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (e) {
    console.error('Fetch error:', e.message, `after ${Date.now() - start}ms`);
  }

  console.log('\nTesting grounded search call...');
  const start2 = Date.now();
  try {
    const res2 = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Find the official Instagram account for Cristiano Ronaldo. Return JSON with username and url.' }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2 }
      })
    });
    console.log(`Status: ${res2.status} in ${Date.now() - start2}ms`);
    if (!res2.ok) {
      console.log('Error:', await res2.text());
      return;
    }
    const data2 = await res2.json();
    console.log('Response:', data2?.candidates?.[0]?.content?.parts?.map(p => p.text).join(''));
    console.log('Grounding:', JSON.stringify(data2?.candidates?.[0]?.groundingMetadata?.webSearchQueries));
  } catch (e) {
    console.error('Fetch error:', e.message, `after ${Date.now() - start2}ms`);
  }
}

test();
