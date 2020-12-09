import {Entity, model, property} from '@loopback/repository';
import {BaseEntity} from "./base-entity.model";

@model()
export class Category extends Entity implements BaseEntity {

    @property({
        type: 'string',
        required: true,
    })
    name: string;

    @property({
        type: 'string',
        required: false,
        default: '',
    })
    description: string;

    @property({
        type: 'boolean',
        required: false,
        default: true,
    })
        // eslint-disable-next-line @typescript-eslint/naming-convention
    is_active: boolean;

    @property({
        type: 'string',
        id: true,
        generated: false,
        required: true,
    })
    id: string;

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

    [prop: string]: any;

    constructor(data?: Partial<Category>) {
        super(data);
    }
}

export interface CategoryRelations {
    // describe navigational properties here
}

export type CategoryWithRelations = Category & CategoryRelations;
