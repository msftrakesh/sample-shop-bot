import axios from "axios";
import {
  SearchClient,
  AzureKeyCredential,
  SearchOptions as AzureSearchOptions,
} from "@azure/search-documents";
import { Product, SearchOptions } from "../../types"; 

export class SearchService {
  private searchClient: SearchClient<Product>;

  constructor() {
    this.searchClient = new SearchClient<Product>(
      process.env.AZURE_SEARCH_ENDPOINT || "",
      process.env.AZURE_SEARCH_INDEX_NAME || "",
      new AzureKeyCredential(process.env.AZURE_SEARCH_API_KEY || "")
    );
  }

  async searchProducts(query: string, options: SearchOptions = {}): Promise<Product[]> {
    try {
      const embedding = await this.generateEmbedding(query);

      const searchResults = await this.searchClient.search(query, {
        ...(options as any),
        vector: {
          value: embedding,
          kNearestNeighborsCount: 10,
          fields: "productVector",
        },
        searchFields: ["name", "description", "features", "category", "keywords"],
        select: ["id", "name", "description", "price", "category", "url"],
      } as any);

      const results: Product[] = [];
      for await (const result of searchResults.results) {
        results.push(result.document);
      }

      return results;
    } catch (error) {
      console.error("Error searching products:", error);
      throw error;
    }
  }

  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      const endpoint = process.env.AZURE_OPENAI_ENDPOINT; // e.g. https://my-openai.openai.azure.com
      const apiKey = process.env.AZURE_OPENAI_KEY;
      const deployment = process.env.EMBEDDING_MODEL_NAME; // e.g. "text-embedding-ada-002"

      const response = await axios.post(
        `${endpoint}/openai/deployments/${deployment}/embeddings?api-version=2023-05-15`,
        {
          input: text,
        },
        {
          headers: {
            "api-key": apiKey || "",
            "Content-Type": "application/json",
          },
        }
      );

      return response.data.data[0].embedding;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Azure OpenAI error:", error.response?.data || error.message);
      } else {
        console.error("Unexpected error generating embedding:", error);
      }
      throw error;
    }
  }

  async findRelatedProducts(productId: string): Promise<Product[]> {
    try {
        const product = await this.searchClient.getDocument(productId) as Product;
      if (!product) {
        throw new Error("Product not found");
      }

      return this.searchProducts(product.name, { top: 5 });
    } catch (error) {
      console.error("Error finding related products:", error);
      throw error;
    }
  }

  async getProductById(productId: string): Promise<Product> {
    try {
      const product = await this.searchClient.getDocument(productId);
      return product as Product;
    } catch (error) {
      console.error(`Error retrieving product by ID (${productId}):`, error);
      throw error;
    }
  }

  async getRecommendedProducts(product: Product, top: number = 5): Promise<Product[]> {
    try {
      if (!product.productVector) {
        throw new Error("Product does not contain a vector for similarity search.");
      }
  
      const searchResults = await this.searchClient.search("", {
        vector: {
          value: product.productVector, // ✅ updated field
          kNearestNeighborsCount: top,
          fields: "productVector", // ✅ this must match the vector field name in your Azure Search index
        },
        filter: `id ne '${product.id}'`,
        select: ["id", "name", "description", "price", "category", "url"],
      } as any);
  
      const results: Product[] = [];
      for await (const result of searchResults.results) {
        results.push(result.document);
      }
  
      return results;
    } catch (error) {
      console.error("Error retrieving recommended products:", error);
      throw error;
    }
  }

  
  async searchSimilarProducts(query: string, k: number = 5): Promise<Product[]> {
    const queryVector = await this.generateEmbedding(query);
  
    const vectorSearch = {
      kNearestNeighborsCount: k,
      fields: ["productVector"],
      vector: queryVector,
    };
  
    const results = await this.searchClient.search("", {
      vectorQueries: [vectorSearch],
    } as any); // 👈 cast as any to avoid TS complaints
  
    const products: Product[] = [];
    for await (const result of results.results) {
      if (result.document) {
        products.push(result.document);
      }
    }
  
    return products;
  }

}
