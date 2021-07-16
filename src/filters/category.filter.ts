import {DefaultFilter} from "./default.filter";
import {Category} from "../models";

export class CategoryFilterBuilder extends DefaultFilter<Category> {
    protected defaultFilter() {
        return this.isActive(Category);
    }
}