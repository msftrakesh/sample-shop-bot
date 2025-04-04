import axios from "axios";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const SEARCH_ENDPOINT = process.env.AZURE_SEARCH_ENDPOINT!;
const SEARCH_API_KEY = process.env.AZURE_SEARCH_API_KEY!;
const SEARCH_INDEX = process.env.AZURE_SEARCH_INDEX_NAME!;
const OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT!;
const OPENAI_API_KEY = process.env.AZURE_OPENAI_API_KEY!;
const MODEL = process.env.EMBEDDING_MODEL_NAME!;

export async function getEmbedding(text: string): Promise<number[]> {
  const response = await axios.post(
    `${OPENAI_ENDPOINT}/openai/deployments/${MODEL}/embeddings?api-version=2024-03-01-preview`,
    { input: text },
    {
      headers: {
        "api-key": OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data.data[0].embedding;
}

export async function uploadToSearch(docs: any[]) {
  const body = {
    value: docs.map((d) => ({
      "@search.action": "mergeOrUpload",
      ...d,
    })),
  };

  await axios.post(
    `${SEARCH_ENDPOINT}/indexes/${SEARCH_INDEX}/docs/index?api-version=2024-03-01-preview`,
    body,
    {
      headers: {
        "Content-Type": "application/json",
        "api-key": SEARCH_API_KEY,
      },
    }
  );
}

export async function loadAndIndexData(): Promise<void> {
  console.time("⏳ IndexingTime");

  const raw = fs.readFileSync("./data/sample_products.json", "utf8");
  const items = JSON.parse(raw).products.data.items;

  const docs = [];

  for (const item of items) {
    const inputText = `${item.name} ${item.description} ${item.features}`;
    const vector = await getEmbedding(inputText);

    docs.push({
      ...item,
      price: parseFloat(item.price),
      vector,
    });
  }

  const vectorSize = docs[0].vector.length;
  const sampleDoc = docs[0];

  await createSearchIndexIfNotExists(vectorSize, sampleDoc);
  await uploadToSearch(docs);

  console.timeEnd("⏳ IndexingTime");
  console.log(`✔️ Indexed ${docs.length} products into Azure AI Search`);
}

export async function createSearchIndexIfNotExists(
  vectorSize: number,
  sampleDoc: any
) {
  try {
    await axios.get(
      `${SEARCH_ENDPOINT}/indexes/${SEARCH_INDEX}?api-version=2024-03-01-preview`,
      {
        headers: {
          "api-key": SEARCH_API_KEY,
        },
      }
    );
    console.log("🔎 Index already exists");
  } catch (error: any) {
    if (error.response?.status === 404) {
      console.log("📦 Creating new index from sample doc...");

      const fields = Object.keys(sampleDoc).map((key) => {
        const val = sampleDoc[key];

        // Handle vector field
        if (key === "vector" && Array.isArray(val)) {
          return {
            name: key,
            type: "Collection(Edm.Single)",
            searchable: true,
            dimensions: vectorSize,
            vectorSearchProfile: "default",
            filterable: false,
            sortable: false,
            facetable: false,
          };
        }

        // Handle ID field
        if (key === "id") {
          return {
            name: key,
            type: "Edm.String",
            key: true,
            searchable: false,
            filterable: true,
            sortable: true,
            facetable: false,
          };
        }

        // Handle numbers
        if (typeof val === "number") {
          return {
            name: key,
            type: "Edm.Double",
            searchable: false,
            filterable: true,
            sortable: true,
            facetable: false,
          };
        }

        // Default: string fields
        return {
          name: key,
          type: "Edm.String",
          searchable: true,
          filterable: true,
          sortable: false,
          facetable: false,
        };
      });

      const indexDefinition = {
        name: SEARCH_INDEX,
        fields,
        vectorSearch: {
          profiles: [
            {
              name: "default",
              algorithm: "default-hnsw",
            },
          ],
          algorithms: [
            {
              name: "default-hnsw",
              kind: "hnsw",
              hnswParameters: {
                metric: "cosine",
                m: 4,
                efConstruction: 400,
              },
            },
          ],
        },
      };

      try {
        console.log(
          "📝 Creating index with definition:\n",
          JSON.stringify(indexDefinition, null, 2)
        );

        await axios.put(
          `${SEARCH_ENDPOINT}/indexes/${SEARCH_INDEX}?api-version=2024-03-01-preview`,
          indexDefinition,
          {
            headers: {
              "Content-Type": "application/json",
              "api-key": SEARCH_API_KEY,
            },
          }
        );

        console.log("✅ Index created successfully");
      } catch (err: any) {
        console.error("❌ Azure Search API Error:");
        console.error(JSON.stringify(err.response?.data, null, 2));
        throw err;
      }
    } else {
      throw error;
    }
  }
}
