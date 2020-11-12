import {BindingScope, injectable} from '@loopback/core';
import {rabbitmqSubscribe} from "../decorators";
import {repository} from "@loopback/repository";
import {CategoryRepository} from "../repositories";

@injectable({scope: BindingScope.TRANSIENT})
export class CategorySyncService {
    constructor(
        @repository(CategoryRepository) private categoryRepo: CategoryRepository,
    ) {
    }

    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'x',
        routingKey: 'model.category.*'
    })
    handler() {
        console.log(this.categoryRepo.entityClass, 'handler');
    }


    @rabbitmqSubscribe({
        exchange: 'amq.topic',
        queue: 'x1',
        routingKey: 'model.category1.*'
    })
    handler1() {
        console.log(this.categoryRepo.entityClass, 'handler1');
    }
}
