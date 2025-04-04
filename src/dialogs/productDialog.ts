import { ActivityHandler, TurnContext, ConversationState } from 'botbuilder';
import { SearchService } from '../services/search/searchService';
import { askOpenAI } from '../services/openAI/openAiService';

export class ProductDialog extends ActivityHandler {
    private searchService: SearchService;

    constructor(private conversationState: ConversationState) {
        super();
        this.searchService = new SearchService();

        this.onMessage(async (context, next) => {
            const productId = context.activity.channelData?.productId || 'GGOEWXXX0828';
            const query = context.activity.text;

            try {
                const product = await this.searchService.getProductById(productId);
                const answer = await askOpenAI(query, product);
             //   const recommendations = await this.searchService.getRecommendedProducts(product);

                await context.sendActivity(answer);

                // if (recommendations.length > 0) {
                //     await context.sendActivity("Here are some similar products:");
                //     for (const r of recommendations) {
                //         await context.sendActivity(`${r.name} - $${r.price}`);
                //     }
                // }
            } catch (err) {
                console.error("Error handling message:", err);
                await context.sendActivity("Sorry, I couldn't fetch product details.");
            }

            await next();
        });
    }

    async run(context: TurnContext) {
        await super.run(context);
        await this.conversationState.saveChanges(context);
    }
}
