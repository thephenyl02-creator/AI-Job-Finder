import { getOpenAIClient } from './openai-client';
import { isDescriptionFlat } from './description-cleaner';

export async function formatFlatDescription(description: string): Promise<string> {
  if (!description || description.length < 300) return description;
  if (!isDescriptionFlat(description)) return description;

  try {
    const client = getOpenAIClient();

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      max_tokens: 4000,
      messages: [
        {
          role: 'system',
          content: `You are a text formatter. Your ONLY job is to take a wall of unformatted text (a job description) and add proper line breaks, paragraph breaks, and structure. You must:

1. Identify section headings (like "Responsibilities", "Qualifications", "About the Role") and put them on their own line with a blank line before them.
2. Turn inline lists into proper bullet points (lines starting with "- ").
3. Add paragraph breaks between distinct topics.
4. Preserve ALL original wording exactly — do not add, remove, summarize, or rephrase any content.
5. Do not add any markdown formatting (no #, **, etc.) — use plain text only.
6. Do not add section headings that don't exist in the original text.
7. If the text already has some structure, preserve it and only fix the flat/jammed parts.

Output ONLY the reformatted text. No explanations, no preamble.`
        },
        {
          role: 'user',
          content: description
        }
      ]
    });

    const formatted = response.choices[0]?.message?.content?.trim();
    if (!formatted || formatted.length < description.length * 0.5) {
      return description;
    }

    return formatted;
  } catch (err: any) {
    console.error('AI description formatting failed:', err.message);
    return description;
  }
}
