export default class GenerationError extends Error {
    context: object | null;

    constructor(message: string, context: object | null = null) {
        super(message);
        this.context = context;
    }
}