import OpenAI from "openai";

export async function generateImage(prompt: string, apiKey: string) {
  const openai = new OpenAI({ apiKey });
  
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: prompt,
    n: 1,
    size: "1024x1024",
    quality: "standard",
  });

  return response.data[0].url;
}
