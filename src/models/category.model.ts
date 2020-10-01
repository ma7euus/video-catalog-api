import {Entity, model, property} from '@loopback/repository';

@model()
export class Category extends Entity {

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
    })
    name: string;

    @property({
        type: 'boolean',
        required: false
    })
        // eslint-disable-next-line @typescript-eslint/naming-convention
    is_active: boolean = true;

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
