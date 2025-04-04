//import { SearchClient, AzureKeyCredential } from '@azure/search-documents';
//import { OpenAIClient } from '@azure/openai';
// import { TextAnalyticsClient } from '@azure/ai-text-analytics';
// import * as sdk from 'microsoft-cognitiveservices-speech-sdk';
// import { TurnContext } from 'botbuilder';

export interface Product {
    id: string;
    name: string;
    description: string;
    price: number;
    category: string;
    imageUrl?: string;
    brand?: string;
    rating?: number;
    productVector?: number[];
    features?: string;
    keywords?: string;
    url?: string;
  }

export interface UserContext {
    recentProducts: Product[];
    interactionTypes: string[];
}

export interface SearchOptions {
    k?: number;
    filter?: string;
    select?: string[];
    orderBy?: string[];
    top?: number;
}

export interface UserInteraction {
    id: string;
    userId: string;
    productId: string;
    interactionType: string;
    timestamp: Date;
}

export interface TextAnalyticsResult {
    id: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    confidenceScore: number;
}

export interface BotMessage {
    text: string;
    audio?: ArrayBuffer;
    attachments?: Array<{
        type: string;
        data: any;
    }>;
}

// export interface AzureClients {
//     searchClient: SearchClient<Product>;
//     openAIClient: OpenAIClient;
//     textAnalyticsClient: TextAnalyticsClient;
// }

export interface SpeechConfig {
    subscriptionKey: string;
    region: string;
    language: string;
}

export interface BotContext {
    userId: string;
    recentMessages: string[];
    userPreferences: Record<string, any>;
} 