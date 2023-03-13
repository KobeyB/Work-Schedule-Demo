
export class NoPreviousDataError extends Error {
    constructor() {
        super("No previous data exists.");
        this.name = "NoPreviousData";
    }
}

export class NoFurtherDataError extends Error {
    constructor() {
        super("No further data exists.");
        this.name = "NoFurtherData";
    }
}