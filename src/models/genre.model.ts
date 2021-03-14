import {Entity, model, property} from '@loopback/repository';
import {BaseEntity} from "./base-entity.model";
import {RelCategoryFields} from "./category.model";

@model()
export class Genre extends Entity implements BaseEntity {

    @property({
        type: 'string',
        id: true,
        generated: false,
        required: true,
    })
    id: string;

    @property({
        type: 'string',
        required: true,
        jsonSchema: {
            minLength: 1,
            maxLength: 255
        }
    })
    name: string;

    @property({
        type: 'boolean',
        required: false,
        default: true,
    })
        // eslint-disable-next-line @typescript-eslint/naming-convention
    is_active: boolean;

    @property({
        type: 'date',
        required: true
    })
        // eslint-disable-next-line @typescript-eslint/naming-convention
    created_at: string;

    @property({
        type: 'date',
        required: true
    })
        // eslint-disable-next-line @typescript-eslint/naming-convention
    updated_at: string;

    @property({
        type: 'object',
        jsonSchema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: {
                        type: 'string'
                    },
                    name: {
                        type: 'string'
                    },
                    is_active: {
                        type: 'boolean'
                    }
                }
            },
            uniqueItems: true
        }
    })
    categories: RelCategoryFields;

    [prop: string]: any;

    constructor(data?: Partial<Genre>) {
        super(data);
    }
}

export interface GenreRelations {
    // describe navigational properties here
}

export type GenreWithRelations = Genre & GenreRelations;