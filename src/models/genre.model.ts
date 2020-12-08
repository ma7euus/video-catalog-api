import {model, property} from '@loopback/repository';
import {BaseEntity} from "./base-entity.model";

@model()
export class Genre extends BaseEntity {

    @property({
        type: 'string',
        required: true,
    })
    name: string;

    @property({
        type: 'boolean',
        required: false,
        default: true,
    })
        // eslint-disable-next-line @typescript-eslint/naming-convention
    is_active: boolean;

    [prop: string]: any;

    constructor(data?: Partial<Genre>) {
        super(data);
    }
}

export interface GenreRelations {
    // describe navigational properties here
}

export type GenreWithRelations = Genre & GenreRelations;