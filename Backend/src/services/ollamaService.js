const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3';

/**
 * Sends a prompt to the local Ollama instance and returns the parsed JSON result.
 */
async function generateOllamaResponse(prompt, systemPrompt = '') {
    try {
        const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: OLLAMA_MODEL,
                prompt: prompt,
                system: systemPrompt,
                stream: false,
                format: 'json' // Enforces JSON output from Ollama
            })
        });

        if (!response.ok) {
            throw new Error(`Ollama server returned status: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return JSON.parse(data.response);
    } catch (error) {
        if (error.code === 'ECONNREFUSED' || error.cause?.code === 'ECONNREFUSED') {
            throw new Error('Could not connect to Ollama. Please ensure Ollama is installed and running (`ollama serve`).');
        }
        throw error;
    }
}

module.exports = { generateOllamaResponse };