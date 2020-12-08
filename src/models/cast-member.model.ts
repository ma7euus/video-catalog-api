import {model, property} from '@loopback/repository';
import {BaseEntity} from "./base-entity.model";

export enum CastMemberType {
    DIRECTOR = 1,
    ACTOR = 2,
}

@model()
export class CastMember extends BaseEntity {

    @property({
        type: 'string',
        required: true,
        jsonSchema: {
            minLength: 1,
            maxLength: 255,
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
        type: 'number',
        required: true,
    })
        // eslint-disable-next-line @typescript-eslint/naming-convention
    type: boolean;

    [prop: string]: any;

    constructor(data?: Partial<CastMember>) {
        super(data);
    }
}

export interface CastMemberRelations {
    // describe navigational properties here
}

export type CastMemberWithRelations = CastMember & CastMemberRelations;
