import axios from 'axios';
import { Product } from  "../../types"; 

export async function askOpenAI(userQuery: string, product: Product): Promise<string> {
  try {
    const endpoint = process.env.AZURE_OPENAI_ENDPOINT; 
    const apiKey = process.env.AZURE_OPENAI_API_KEY;
    const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME; 

    if (!endpoint || !apiKey || !deployment) {
      throw new Error('Missing Azure OpenAI config in environment variables.');
    }

    const productDescription = JSON.stringify(product, null, 2);

    const response = await axios.post(
      `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2023-07-01-preview`,
      {
        messages: [
          {
            role: 'system',
            content: `You are a helpful shopping assistant. Answer based only on the product info provided.`,
          },
          {
            role: 'user',
            content: `Product Info:\n${productDescription}`,
          },
          {
            role: 'user',
            content: userQuery,
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error: any) {
    console.error("Error in askOpenAI:", error.response?.data || error.message || error);
    return "Sorry, I couldn't get a response about the product.";
  }
}
