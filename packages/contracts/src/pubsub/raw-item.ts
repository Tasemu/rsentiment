import { z } from "zod";
import { rawCommentSchema } from "./raw-comment.js";
import { rawPostSchema } from "./raw-post.js";

export const rawItemSchema = z.discriminatedUnion("itemKind", [rawPostSchema, rawCommentSchema]);

export type RawItem = z.infer<typeof rawItemSchema>;
