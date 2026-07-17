import 'dotenv/config';

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function preguntarIA(mensaje) {
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: 'Eres SOSI CODEX, un asistente amigable de WhatsApp. Responde corto, natural y en español.' },
          { role: 'user', content: mensaje }
        ],
        max_tokens: 400
      })
    });
    const data = await res.json();

    if (data.error) {
      console.error('Error de Groq:', data.error.message);
      return null;
    }

    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch (err) {
    console.error('Error conectando con Groq:', err.message);
    return null;
  }
}
