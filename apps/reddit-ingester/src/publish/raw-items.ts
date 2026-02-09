import { PubSub } from "@google-cloud/pubsub";
import { rawItemSchema, type RawItem } from "@rsentiment/contracts";

export type RawItemPublisher = {
  publish(items: RawItem[]): Promise<number>;
};

export function createRawItemPublisher(projectId: string, topicName: string): RawItemPublisher {
  const pubsub = new PubSub({ projectId });
  const topic = pubsub.topic(topicName);

  return {
    async publish(items: RawItem[]): Promise<number> {
      for (const item of items) {
        const validated = rawItemSchema.parse(item);
        await topic.publishMessage({
          data: Buffer.from(JSON.stringify(validated), "utf-8"),
          attributes: {
            source: validated.source,
            itemKind: validated.itemKind,
            subreddit: validated.subreddit,
            redditId: validated.redditId
          }
        });
      }

      return items.length;
    }
  };
}
