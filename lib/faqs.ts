export interface FaqItem {
    question: string;
    answer: string;
}

export const FAQS: FaqItem[] = [
    {
        question: "Is Inkline really free?",
        answer: "Yes - completely free, forever. Inkline is open-source under the AGPL-3.0 License. There are no premium tiers, no feature gates, and no subscriptions.",
    },
    {
        question: "Where is my data stored?",
        answer: "By default, your data is stored locally on your machine. If you enable cloud sync, your data is stored securely in the cloud database - but local storage always remains available.",
    },
    {
        question: "Can I use Inkline offline?",
        answer: "Yes. Inkline is built with a local-first architecture. You can write, edit, and manage your projects entirely offline, then sync when you're ready.",
    },
    {
        question: "Do I need an AI API key?",
        answer: "AI features are optional. Grammar checking works offline. For AI chat and generation features, you'll need a Gemini API key (free tier available).",
    },
    {
        question: "What formats can I export to?",
        answer: "Currently, Inkline supports EPUB export. PDF and additional formats are planned for future releases.",
    },
    {
        question: "How do I report a bug?",
        answer: "The fastest path is the contact form. For technical issues, include your operating system, reproduction steps, and screenshots so we can resolve it quickly.",
    },
];
