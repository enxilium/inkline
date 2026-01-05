/**
 * ILanguageToolService
 *
 * Domain interface for grammar and spell checking.
 * Implementations may use local servers or public APIs.
 */

/**
 * A replacement suggestion for a grammar/spelling issue
 */
export interface LanguageToolReplacement {
    /** The suggested replacement text */
    value: string;
}

/**
 * Context around a grammar/spelling issue
 */
export interface LanguageToolContext {
    /** Text surrounding the issue */
    text: string;
    /** Character offset within the context where the issue starts */
    offset: number;
    /** Length of the issue within the context */
    length: number;
}

/**
 * A category describing the type of issue
 */
export interface LanguageToolCategory {
    /** Category identifier */
    id: string;
    /** Human-readable category name */
    name: string;
}

/**
 * A rule that was triggered
 */
export interface LanguageToolRule {
    /** Rule identifier */
    id: string;
    /** Human-readable description */
    description: string;
    /** Category this rule belongs to */
    category: LanguageToolCategory;
    /** Issue type (e.g., 'misspelling', 'grammar') */
    issueType?: string;
}

/**
 * A single grammar/spelling match (issue found)
 */
export interface LanguageToolMatch {
    /** Human-readable message describing the issue */
    message: string;
    /** Short message (optional) */
    shortMessage?: string;
    /** Character offset in the original text */
    offset: number;
    /** Length of the problematic text */
    length: number;
    /** Suggested replacements */
    replacements: LanguageToolReplacement[];
    /** Context around the issue */
    context: LanguageToolContext;
    /** The rule that triggered this match */
    rule: LanguageToolRule;
}

/**
 * Detected language information
 */
export interface DetectedLanguage {
    /** Language name */
    name: string;
    /** Language code (e.g., 'en-US') */
    code: string;
    /** Confidence score (0-1) */
    confidence?: number;
}

/**
 * Language information in the response
 */
export interface LanguageInfo {
    /** Language name */
    name: string;
    /** Language code */
    code: string;
    /** Detected language (if auto-detection was used) */
    detectedLanguage?: DetectedLanguage;
}

/**
 * Response from a grammar check request
 */
export interface LanguageToolResponse {
    /** Language information */
    language: LanguageInfo;
    /** Array of matches (issues found) */
    matches: LanguageToolMatch[];
}

/**
 * Request parameters for grammar checking
 */
export interface GrammarCheckRequest {
    /** The text to check */
    text: string;
    /** Language code (e.g., 'en-US', 'auto' for auto-detection) */
    language: string;
}

/**
 * Interface for grammar and spell checking services
 */
export interface ILanguageToolService {
    /**
     * Check text for grammar and spelling issues
     * @param request The check request containing text and language
     * @returns Promise resolving to the check response
     */
    checkGrammar(request: GrammarCheckRequest): Promise<LanguageToolResponse>;

    /**
     * Check if the service is using a local server
     * @returns true if using local server, false if using public API
     */
    isUsingLocalServer(): boolean;

    /**
     * Check if the local server is installed and available
     * @returns true if local server components are installed
     */
    isInstalled(): boolean;

    /**
     * Wait for the service to be ready
     * @returns Promise that resolves when the service is ready
     */
    waitForReady(): Promise<void>;

    /**
     * Shutdown the service gracefully
     */
    shutdown(): Promise<void>;
}
