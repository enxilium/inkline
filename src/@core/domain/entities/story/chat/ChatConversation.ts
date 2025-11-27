/**
 * ChatConversation groups a sequence of chat messages for a single project.
 */
export class ChatConversation {
    constructor(
        public id: string,
        public title: string | null,
        public createdAt: Date,
        public updatedAt: Date
    ) {}
}
