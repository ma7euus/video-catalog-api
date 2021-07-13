import {RequestContext} from "@loopback/rest";
import {stringify} from "qs";
import {Exclude, Expose} from "class-transformer";

export class PaginatorSerializer<T = any> {

    @Exclude()
    baseUrl: string;

    constructor(
        public results: T[],
        public count: number,
        public limit: number,
        public offset: number,
    ) {
    }

    @Expose()
    get previous_url(): string | null {
        let previous: string | null = null;
        if (this.offset > 0 && this.count) {
            previous = `${this.baseUrl}?${stringify({
                filter: {
                    limit: this.limit,
                    ...(this.offset - this.limit > 0 && {offset: this.offset}),
                }
            })}`;
        }
        return previous;
    }

    @Expose()
    get next_url(): string | null {
        let next: string | null = null;
        if (this.count > this.offset + this.limit) {
            next = `${this.baseUrl}?${stringify({
                filter: {
                    limit: this.limit,
                    ...(this.offset >= 0 && this.limit >= 0 && {offset: this.offset + this.limit}),
                }
            })}`;
        }
        return next;
    }

    toJson(request: RequestContext) {
        this.baseUrl = `${request.requestedBaseUrl}${request.request.url}`;
        return {
            results: this.results,
            count: this.count,
            limit: this.limit,
            offset: this.offset,
            previous_url: this.previous_url,
            next_url: this.next_url,
        };
    }
}